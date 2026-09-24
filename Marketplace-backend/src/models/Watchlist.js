import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
}, { timestamps: true });

watchlistSchema.index({ user: 1, listing: 1 }, { unique: true });
watchlistSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Watchlist', watchlistSchema);
