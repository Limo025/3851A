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
  const cooldownStart = new Date(now - 24 * 60 * 60 * 1000);
  if (user.appeal?.status === 'pending') {
    return res.status(409).json({ error: 'You already have an appeal pending administrator review.' });
  }
  if (user.lastAppealAt && new Date(user.lastAppealAt) > cooldownStart) {
    return res.status(429).json({ error: 'You can submit another appeal 24 hours after your previous submission.' });
  }
  const claimed = await UserModel.findOneAndUpdate({ _id: user._id, isBanned: true, 'appeal.status': { $ne: 'pending' }, $or: [{ lastAppealAt: null }, { lastAppealAt: { $lte: cooldownStart } }] }, { $set: { lastAppealAt: now, appeal: { reason, status: 'pending', submittedAt: now } } }, { returnDocument: 'after', runValidators: true });
  if (!claimed) return res.status(409).json({ error: 'Your appeal status changed. Refresh the page and try again.' });
  return res.json({ message: 'Your appeal has been submitted for administrator review.' });
});
return router;
}
export default createAppealsRouter();
