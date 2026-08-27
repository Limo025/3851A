import express from 'express';
import User from '../models/User.js';

async function defaultFirebaseAuthResolver() {
    const { auth } = await import('../config/firebase.js');
    return auth;
}

export function createAuthRouter({
    firebaseAuth,
    fetchImpl = globalThis.fetch,
    resolveFirebaseAuth = defaultFirebaseAuthResolver,
} = {}) {
    const router = express.Router();
    let resolvedFirebaseAuth = firebaseAuth;

    async function getFirebaseAuth() {
        if (!resolvedFirebaseAuth) {
            resolvedFirebaseAuth = await resolveFirebaseAuth();
        }
        return resolvedFirebaseAuth;
    }

    router.post('/register', async (req, res) => {
        const { email, password, username = '' } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        try {
            const firebaseUser = await (await getFirebaseAuth()).createUser({ email, password, displayName: username });
            const user = await User.create({ uid: firebaseUser.uid, email: firebaseUser.email, username });
            res.status(201).json({
                message: 'User registered successfully',
                user: { uid: user.uid, email: user.email, username: user.username },
            });
        } catch (err) {
            if (err.code === 'auth/email-already-exists') {
                return res.status(409).json({ error: 'Email already in use' });
            }
            console.error('Register error:', err);
            res.status(500).json({ error: 'Registration failed' });
        }
    });

    router.post('/login', async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        try {
            const response = await fetchImpl(
                `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, returnSecureToken: true }),
                }
            );
            const data = await response.json();

            if (!response.ok) {
                const message = data.error?.message || 'Login failed';
                const status = message === 'EMAIL_NOT_FOUND' || message === 'INVALID_PASSWORD' ? 401 : 400;
                return res.status(status).json({ error: 'Invalid email or password' });
            }

            const user = await User.findOne({ uid: data.localId });
            res.json({
                idToken: data.idToken,
                refreshToken: data.refreshToken,
                expiresIn: data.expiresIn,
                user: user
                    ? { uid: user.uid, email: user.email, username: user.username }
                    : { uid: data.localId, email: data.email },
            });
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({ error: 'Login failed' });
        }
    });

    router.post('/refresh', async (req, res) => {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        try {
            const response = await fetchImpl(
                `https://securetoken.googleapis.com/v1/token?key=${process.env.FIREBASE_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
                }
            );
            if (!response.ok) {
                return res.status(401).json({ error: 'Unable to refresh session' });
            }

            const data = await response.json();
            res.json({
                idToken: data.id_token,
                refreshToken: data.refresh_token,
                expiresIn: data.expires_in,
            });
        } catch {
            res.status(500).json({ error: 'Unable to refresh session' });
        }
    });

    router.post('/google', async (req, res) => {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ error: 'idToken is required' });
        }

        try {
            const decoded = await (await getFirebaseAuth()).verifyIdToken(idToken);
            const { uid, email, name } = decoded;
            let user = await User.findOne({ uid });
            if (!user) {
                user = await User.create({ uid, email, username: name || email.split('@')[0] });
            }
            res.json({ user: { uid: user.uid, email: user.email, username: user.username } });
        } catch (err) {
            console.error('Google auth error:', err);
            res.status(401).json({ error: 'Invalid Google token' });
        }
    });

    router.get('/me', async (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }

        try {
            req.user = await (await getFirebaseAuth()).verifyIdToken(authHeader.slice('Bearer '.length));
        } catch {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        try {
            const user = await User.findOne({ uid: req.user.uid });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json({ uid: user.uid, email: user.email, username: user.username });
        } catch (err) {
            console.error('Me error:', err);
            res.status(500).json({ error: 'Failed to fetch user' });
        }
    });

    return router;
}

export default createAuthRouter();
