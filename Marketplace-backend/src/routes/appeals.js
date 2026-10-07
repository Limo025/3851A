import express from 'express';
import User from '../models/User.js';
import { verifyFirebaseToken } from '../utils/verifyToken.js';

export function createAppealsRouter({ UserModel = User, verifyAppealToken = verifyFirebaseToken } = {}) {
const router = express.Router();
router.post('/', async (req, res) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  const decoded = token ? await verifyAppealToken(token) : null;
  if (!decoded?.uid) return res.status(401).json({ error: 'Please sign in again to submit an appeal.' });
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 20 || reason.length > 2000) return res.status(400).json({ error: 'Appeal must be between 20 and 2000 characters.' });
  const user = await UserModel.findOne({ uid: decoded.uid });
  if (!user?.isBanned) return res.status(403).json({ error: 'Only banned accounts can appeal.' });
  const now = new Date();
  const claimed = await UserModel.findOneAndUpdate({ _id: user._id, isBanned: true, 'appeal.status': { $ne: 'pending' }, $or: [{ lastAppealAt: null }, { lastAppealAt: { $lte: new Date(now - 24 * 60 * 60 * 1000) } }] }, { $set: { lastAppealAt: now, appeal: { reason, status: 'pending', submittedAt: now } } }, { returnDocument: 'after', runValidators: true });
  if (!claimed) return res.status(429).json({ error: 'An appeal is already pending, or you submitted one within the last 24 hours.' });
  return res.json({ message: 'Your appeal has been submitted for administrator review.' });
});
return router;
}
export default createAppealsRouter();
