import express from 'express';
import mongoose from 'mongoose';
import { verifyToken } from '../middleware/auth.js';
import User from '../models/User.js';
import Listing from '../models/Listing.js';
import { closeConnections } from '../sockets/connectionMap.js';
import { deleteListing } from '../services/deleteListing.js';

const adminUids = () => new Set((process.env.ADMIN_UIDS || '').split(',').map((uid) => uid.trim()).filter(Boolean));

export function createAdminRouter({
  authenticate = verifyToken,
  UserModel = User,
  ListingModel = Listing,
  closeUserConnections = closeConnections,
  removeListing = deleteListing,
  getAdminUids = adminUids,
} = {}) {
const router = express.Router();

router.use(authenticate, (req, res, next) => (
  getAdminUids().has(req.user.uid) ? next() : res.status(403).json({ error: 'Admin access required' })
));

router.get('/me', (req, res) => res.json({ isAdmin: true }));

router.get('/appeals', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) return res.status(400).json({ error: 'Invalid pagination' });
  const filter = { 'appeal.status': 'pending' };
  const [appeals, total] = await Promise.all([
    UserModel.find(filter, '_id username email isBanned appeal').sort({ 'appeal.submittedAt': 1, _id: 1 }).skip((page - 1) * 20).limit(20).lean(),
    UserModel.countDocuments(filter),
  ]);
  return res.json({ appeals, page, pages: Math.max(1, Math.ceil(total / 20)), total });
});

router.patch('/appeals/:id', async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id) || !['approved', 'rejected'].includes(req.body?.status)) return res.status(400).json({ error: 'Invalid appeal id or status' });
  const status = req.body.status;
  const update = { 'appeal.status': status, 'appeal.reviewedAt': new Date() };
  if (status === 'approved') { update.isBanned = false; update.banReason = ''; }
  const user = await UserModel.findOneAndUpdate({ _id: req.params.id, 'appeal.status': 'pending' }, { $set: update }, { returnDocument: 'after', runValidators: true });
  if (!user) return res.status(409).json({ error: 'No pending appeal found. Refresh the appeals list.' });
  return res.json({ message: status === 'approved' ? 'Appeal approved. User unbanned.' : 'Appeal rejected.', isBanned: user.isBanned, banReason: user.banReason || '' });
});

router.get('/users', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  if (typeof req.query.search !== 'undefined' && typeof req.query.search !== 'string') {
    return res.status(400).json({ error: 'Invalid search' });
  }
  const search = (req.query.search || '').trim();
  if (search.length > 100) return res.status(400).json({ error: 'Search is too long' });
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({ error: 'Invalid pagination' });
  }
  try {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = search ? { $or: [
      { username: { $regex: escapedSearch, $options: 'i' } },
      { email: { $regex: escapedSearch, $options: 'i' } },
    ] } : {};
    const [users, total] = await Promise.all([
      UserModel.find(filter, '_id uid email username isBanned banReason createdAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      UserModel.countDocuments(filter),
    ]);
    return res.json({ users, page, pages: Math.max(1, Math.ceil(total / limit)), total });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/users/:id/listings', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ error: 'Invalid user id' });
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({ error: 'Invalid pagination' });
  }
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const filter = { seller: user._id };
    const [listings, total] = await Promise.all([
      ListingModel.find(filter, '_id title price quantity soldAt images createdAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ListingModel.countDocuments(filter),
    ]);
    return res.json({ listings, page, pages: Math.max(1, Math.ceil(total / limit)), total });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch user listings' });
  }
});

router.patch('/users/:id/ban', async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id) || typeof req.body?.banned !== 'boolean') {
    return res.status(400).json({ error: 'Invalid user id or banned value' });
  }
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (req.body.banned && !reason) return res.status(400).json({ error: 'A ban reason is required' });
  if (reason.length > 1000) return res.status(400).json({ error: 'Ban reason must be 1000 characters or fewer' });
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (req.body.banned && getAdminUids().has(user.uid)) return res.status(403).json({ error: 'Cannot ban an admin' });
    user.isBanned = req.body.banned;
    user.banReason = user.isBanned ? reason : '';
    if (!user.appeal) user.appeal = {};
    user.appeal.status = 'rejected';
    user.appeal.reviewedAt = new Date();
    await user.save();
    if (user.isBanned) closeUserConnections(user.uid);
    return res.json({
      message: user.isBanned ? 'User banned successfully' : 'User unbanned successfully',
      _id: user._id,
      uid: user.uid,
      isBanned: user.isBanned,
      banReason: user.banReason,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to change ban status' });
  }
});

router.delete('/listings/:id', async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ error: 'Invalid listing id' });
  try {
    const listing = await ListingModel.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    await removeListing(listing);
    return res.json({ message: 'Listing deleted successfully', listingId: req.params.id });
  } catch {
    return res.status(500).json({ error: 'Failed to delete listing' });
  }
});

return router;
}

export default createAdminRouter();
