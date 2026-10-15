import express from 'express';
import mongoose from 'mongoose';
import { verifyToken } from '../middleware/auth.js';
import { Conversation } from '../models/Conversation.js';
import Listing from '../models/Listing.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { LISTING_REPORT_REASONS, REPORT_DESCRIPTION_LIMITS, USER_REPORT_REASONS } from '../constants/reports.js';

function validate(reason, description, reasons) {
  const text = typeof description === 'string' ? description.trim() : '';
  if (!reasons.includes(reason)) return { error: 'Select a valid report reason' };
  if (text.length < REPORT_DESCRIPTION_LIMITS.min || text.length > REPORT_DESCRIPTION_LIMITS.max) return { error: 'Description must be 10–1000 characters' };
  return { text };
}

async function saveReport(res, data, ReportModel) {
  try {
    return res.status(201).json(await ReportModel.create(data));
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'You already have a pending report for this target.' });
    throw error;
  }
}

export function createReportsRouter({ authenticate = verifyToken, ReportModel = Report, UserModel = User, ListingModel = Listing, ConversationModel = Conversation } = {}) {
  const router = express.Router();
  router.use(authenticate);

  router.post('/users', async (req, res, next) => {
    try {
      const result = validate(req.body?.reason, req.body?.description, USER_REPORT_REASONS);
      if (result.error) return res.status(400).json({ error: result.error });
      if (!mongoose.isObjectIdOrHexString(req.body?.conversationId)) return res.status(400).json({ error: 'Invalid conversation' });
      const conversation = await ConversationModel.findOne({ _id: req.body.conversationId, $or: [{ buyer: req.user.uid }, { seller: req.user.uid }] });
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
      const targetUid = conversation.buyer === req.user.uid ? conversation.seller : conversation.buyer;
      if (!targetUid || targetUid === req.user.uid) return res.status(400).json({ error: 'You cannot report yourself' });
      const target = await UserModel.findOne({ uid: targetUid });
      if (!target) return res.status(404).json({ error: 'User not found' });
      return await saveReport(res, { reporter: req.currentUser._id, targetType: 'user', targetUser: target._id, conversation: conversation._id, targetLabel: target.username || 'Marketplace user', reason: req.body.reason, description: result.text }, ReportModel);
    } catch (error) { return next(error); }
  });

  router.post('/listings/:listingId', async (req, res, next) => {
    try {
      const result = validate(req.body?.reason, req.body?.description, LISTING_REPORT_REASONS);
      if (result.error) return res.status(400).json({ error: result.error });
      if (!mongoose.isObjectIdOrHexString(req.params.listingId)) return res.status(400).json({ error: 'Invalid listing' });
      const listing = await ListingModel.findById(req.params.listingId);
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (String(listing.seller?._id || listing.seller) === String(req.currentUser._id)) return res.status(400).json({ error: 'You cannot report your own listing' });
      return await saveReport(res, { reporter: req.currentUser._id, targetType: 'listing', targetListing: listing._id, targetLabel: listing.title || 'Deleted listing', reason: req.body.reason, description: result.text }, ReportModel);
    } catch (error) { return next(error); }
  });
  return router;
}

export default createReportsRouter();
