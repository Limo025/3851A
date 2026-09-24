import { verifyFirebaseToken } from '../utils/verifyToken.js';
import User from '../models/User.js';

export function createVerifyToken({ verify = verifyFirebaseToken, UserModel = User } = {}) {
  return async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await verify(idToken);
    if (!decoded?.uid) return res.status(401).json({ error: 'Invalid or expired token' });
    try {
        const currentUser = await UserModel.findOne({ uid: decoded.uid });
        if (!currentUser) return res.status(401).json({ error: 'Authenticated user was not found' });
        if (currentUser.isBanned) return res.status(403).json({ error: 'Account is banned', code: 'ACCOUNT_BANNED' });
        req.user = decoded;
        req.currentUser = currentUser;
        return next();
    } catch (err) {
        console.error('User lookup failed:', err);
        return res.status(500).json({ error: 'Authentication is temporarily unavailable' });
    }
  };
}

export const verifyToken = createVerifyToken();
