import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Listing from '../models/Listing.js';
import Rating from '../models/Rating.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { verifyToken } from '../middleware/auth.js';
import { uploadListingImages } from '../middleware/upload.js';
import imageStorage from '../services/imageStorage.js';

const publicUser = user => ({ id: String(user._id), username: user.username, avatarUrl: user.avatar?.url || null });
export function createUsersRouter({ authenticate = verifyToken } = {}) {
const router = express.Router();

router.get('/me', authenticate, (req, res) => res.json(publicUser(req.currentUser)));
router.patch('/me', authenticate, uploadListingImages, async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  if (!username || username.length > 50 || req.files.length > 1) return res.status(400).json({ error: 'Name must be 1–50 characters and only one avatar is allowed.' });
  let oldAvatar;
  const [avatar] = req.files.length ? await imageStorage.uploadImages(req.files) : [];
  try {
    const previous = await User.findByIdAndUpdate(req.currentUser._id, { $set: { username, ...(avatar ? { avatar } : {}) } }, { returnDocument: 'before', runValidators: true });
    if (!previous) throw new Error('User no longer exists');
    oldAvatar = previous.avatar;
    res.json({ ...publicUser(previous), username, ...(avatar ? { avatarUrl: avatar.url } : {}) });
  } catch (error) {
    if (avatar) await imageStorage.deleteImages([avatar.publicId]).catch(err => console.error('Avatar rollback failed', err));
    throw error;
  }
  if (avatar && oldAvatar?.publicId) await imageStorage.deleteImages([oldAvatar.publicId]).catch(err => console.error('Old avatar cleanup failed', err));
});

router.get('/:id', async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ error: 'Invalid user id' });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const page = Number(req.query.page || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) return res.status(400).json({ error: 'Invalid page' });
  const filter = { seller: user._id, soldAt: null };
  const [listings, total, stats] = await Promise.all([
    user.isBanned ? [] : Listing.find(filter).select('title price images condition').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 12).limit(12).lean(),
    user.isBanned ? 0 : Listing.countDocuments(filter),
    Rating.aggregate([{ $match: { user: user._id } }, { $group: { _id: null, average: { $avg: '$score' }, count: { $sum: 1 } } }]),
  ]);
  res.json({ ...publicUser(user), rating: { average: stats[0]?.average || 0, count: stats[0]?.count || 0 }, listings, page, total, pages: Math.ceil(total / 12) });
});

router.put('/:id/rating', authenticate, async (req, res) => {
  const score = req.body?.score;
  if (!mongoose.isObjectIdOrHexString(req.params.id) || !Number.isInteger(score) || score < 1 || score > 5) return res.status(400).json({ error: 'A valid user and rating from 1 to 5 are required.' });
  const seller = await User.findById(req.params.id);
  if (!seller) return res.status(404).json({ error: 'User not found' });
  if (seller.isBanned || seller.uid === req.user.uid) return res.status(403).json({ error: 'You cannot rate this user.' });
  const conversations = await Conversation.find({ buyer: req.user.uid, seller: seller.uid }).select('_id').lean();
  const sent = await Message.exists({ conversationId: { $in: conversations.map(c => c._id) }, senderId: req.user.uid });
  if (!sent) return res.status(403).json({ error: 'Message this seller before rating them.' });
  await Rating.updateOne({ reviewer: req.currentUser._id, user: seller._id }, { $set: { score } }, { upsert: true, runValidators: true });
  res.json({ message: 'Rating saved.' });
});
return router;
}
export default createUsersRouter();
