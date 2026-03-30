import { auth } from '../config/firebase.js';

export async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decoded = await auth.verifyIdToken(idToken);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
