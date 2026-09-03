import mongoose from 'mongoose';
import 'dotenv/config';

export const MONGODB_DATABASE = 'marketplace';

export async function connectDB({
    uri = process.env.MONGODB_URI,
    connect = mongoose.connect.bind(mongoose),
    log = console.log,
    logError = console.error,
    exit = process.exit,
} = {}) {
    try {
        await connect(uri, { dbName: MONGODB_DATABASE });
        log(`Connected to MongoDB database: ${MONGODB_DATABASE}`);
    } catch (err) {
        logError('MongoDB connection error:', err);
        exit(1);
    }
}
