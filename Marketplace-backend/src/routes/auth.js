import express from 'express';
import { auth } from '../config/firebase.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /auth/register
router.post('/register', async (req, res) => {
    const { email, password, username = '' } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Create user in Firebase Auth
        const firebaseUser = await auth.createUser({ email, password, displayName: username });

        // Store profile in MongoDB
        const user = await User.create({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username,
        });

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

// POST /auth/login
// Body: { email, password }
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const apiKey = process.env.FIREBASE_API_KEY;
        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
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

        // Fetch profile from MongoDB
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

// POST /auth/google
// Body: { idToken }  — idToken comes from Firebase Google sign-in on the frontend
router.post('/google', async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'idToken is required' });
    }

    try {
        // Verify the token and get the Google user info
        const decoded = await auth.verifyIdToken(idToken);
        const { uid, email, name } = decoded;

        // Find existing user or create new one (upsert)
        let user = await User.findOne({ uid });

        if (!user) {
            user = await User.create({
                uid,
                email,
                username: name || email.split('@')[0],
            });
        }

        res.json({
            user: { uid: user.uid, email: user.email, username: user.username },
        });
    } catch (err) {
        console.error('Google auth error:', err);
        res.status(401).json({ error: 'Invalid Google token' });
    }
});

// GET /auth/me 
// Header: Authorization: Bearer <idToken>
router.get('/me', verifyToken, async (req, res) => {
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

export default router;
