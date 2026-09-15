import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/mongodb.js';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import { handleUploadError } from './middleware/upload.js';
import { setupWebSocket } from './config/websocket.js';
import chatRoutes from './routes/chatRoutes.js';

const PORT = process.env.PORT || 8000;
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
setupWebSocket(server);

app.use('/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/chat', chatRoutes);
app.use(handleUploadError);

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log('Server is listening on port ' + PORT);
    });
});
