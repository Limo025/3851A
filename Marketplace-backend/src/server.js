import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/mongodb.js';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import { handleUploadError } from './middleware/upload.js';

const PORT = process.env.PORT || 8000;
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use(handleUploadError);

app.post('/hello', (req, res) => {
    res.send(`hello ${req.body.name}`);
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log('Server is listening on port ' + PORT);
    });
});
