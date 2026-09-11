import mongoose from 'mongoose';

const recentlyViewedSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
  },
  viewedAt: {
    type: Date,
    default: Date.now,
  },
});

recentlyViewedSchema.index({ user: 1, listing: 1 }, { unique: true });
recentlyViewedSchema.index({ user: 1, viewedAt: -1 });

export default mongoose.model('RecentlyViewed', recentlyViewedSchema);
