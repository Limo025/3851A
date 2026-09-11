import express from 'express';
import mongoose from 'mongoose';
import RecentlyViewed from '../models/RecentlyViewed.js';
import Listing from '../models/Listing.js';
import User from '../models/User.js';

const SAFE_SELLER_FIELDS = '_id username';
const RECENT_LIMIT = 10;

async function verifyToken(req, res, next) {
  const { verifyToken: firebaseVerifyToken } = await import('../middleware/auth.js');
  return firebaseVerifyToken(req, res, next);
}

export function createRecentlyViewedRouter({
  RecentlyViewedModel = RecentlyViewed,
  ListingModel = Listing,
  UserModel = User,
  authenticate = verifyToken,
} = {}) {
  const router = express.Router();

  // POST /api/recently-viewed  Body: { listingId }
  router.post('/', authenticate, async (req, res) => {
    const { listingId } = req.body;
    if (!mongoose.isObjectIdOrHexString(listingId)) {
      return res.status(400).json({ error: 'listingId is invalid' });
    }
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Authentication is required' });
    }

    try {
      const currentUser = await UserModel.findOne({ uid: req.user.uid });
      if (!currentUser) {
        return res.status(401).json({ error: 'Authenticated user was not found' });
      }

      const listingExists = await ListingModel.exists({ _id: listingId });
      if (!listingExists) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      await RecentlyViewedModel.findOneAndUpdate(
        { user: currentUser._id, listing: listingId },
        { $set: { viewedAt: new Date() } },
        { upsert: true, setDefaultsOnInsert: true },
      );

      return res.status(204).end();
    } catch {
      return res.status(500).json({ error: 'Failed to record recently viewed listing' });
    }
  });

  // GET /api/recently-viewed
  router.get('/', authenticate, async (req, res) => {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Authentication is required' });
    }

    try {
      const currentUser = await UserModel.findOne({ uid: req.user.uid });
      if (!currentUser) {
        return res.status(401).json({ error: 'Authenticated user was not found' });
      }

      const entries = await RecentlyViewedModel.find({ user: currentUser._id })
        .sort({ viewedAt: -1 })
        .limit(RECENT_LIMIT)
        .populate({
          path: 'listing',
          populate: { path: 'seller', select: SAFE_SELLER_FIELDS },
        })
        .lean();

      const listings = entries
        .filter((entry) => entry.listing !== null)
        .map((entry) => entry.listing);

      return res.json(listings);
    } catch {
      return res.status(500).json({ error: 'Failed to fetch recently viewed listings' });
    }
  });

  return router;
}

export default createRecentlyViewedRouter();
