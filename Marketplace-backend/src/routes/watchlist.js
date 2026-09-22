import express from 'express';
import mongoose from 'mongoose';
import { verifyToken } from '../middleware/auth.js';
import Watchlist from '../models/Watchlist.js';
import Listing from '../models/Listing.js';

export function createWatchlistRouter({ authenticate = verifyToken, WatchlistModel = Watchlist, ListingModel = Listing } = {}) {
const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({ error: 'Invalid pagination' });
  }
  try {
    const filter = { user: req.currentUser._id };
    const [entries, total] = await Promise.all([
      WatchlistModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
        .populate({ path: 'listing', populate: { path: 'seller', select: '_id username' } }).lean(),
      WatchlistModel.countDocuments(filter),
    ]);
    return res.json({ listings: entries.filter((entry) => entry.listing).map((entry) => entry.listing), page, pages: Math.max(1, Math.ceil(total / limit)), total });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

router.put('/:listingId', async (req, res) => {
  const { listingId } = req.params;
  if (!mongoose.isObjectIdOrHexString(listingId)) return res.status(400).json({ error: 'Invalid listing id' });
  try {
    const listing = await ListingModel.findById(listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.soldAt) return res.status(409).json({ error: 'Listing is sold' });
    await WatchlistModel.updateOne({ user: req.currentUser._id, listing: listingId }, { $setOnInsert: { user: req.currentUser._id, listing: listingId } }, { upsert: true });
    return res.status(204).end();
  } catch (error) {
    if (error?.code === 11000) return res.status(204).end();
    return res.status(500).json({ error: 'Failed to save listing' });
  }
});

router.delete('/:listingId', async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.listingId)) return res.status(400).json({ error: 'Invalid listing id' });
  try {
    await WatchlistModel.deleteOne({ user: req.currentUser._id, listing: req.params.listingId });
    return res.status(204).end();
  } catch {
    return res.status(500).json({ error: 'Failed to remove listing' });
  }
});

return router;
}

export default createWatchlistRouter();
