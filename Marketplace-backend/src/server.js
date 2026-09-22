import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/mongodb.js';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import recentlyViewedRoutes from './routes/recentlyViewed.js';
import assistantRoutes from './routes/assistant.js';
import { handleUploadError } from './middleware/upload.js';
import { setupWebSocket } from './config/websocket.js';
import chatRoutes from './routes/chatRoutes.js';

const PORT = process.env.PORT || 8000;
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '8mb' }));

const server = http.createServer(app);
setupWebSocket(server);

app.use('/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/recently-viewed', recentlyViewedRoutes);
app.use('/api/chat', chatRoutes);
// The marketplace assistant has a separate API from direct messages.
app.use('/api/assistant', assistantRoutes);

app.use(handleUploadError);

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log("Web socket is listening on port " + PORT)
    })
});
