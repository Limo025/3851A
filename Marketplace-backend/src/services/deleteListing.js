import RecentlyViewed from '../models/RecentlyViewed.js';
import Watchlist from '../models/Watchlist.js';
import imageStorage from './imageStorage.js';

export async function deleteListing(listing, {
  imageStore = imageStorage,
  RecentlyViewedModel = RecentlyViewed,
  WatchlistModel = Watchlist,
} = {}) {
  const publicIds = (listing.images || []).map(({ publicId }) => publicId);
  await listing.deleteOne();
  const cleanup = await Promise.allSettled([
    RecentlyViewedModel.deleteMany({ listing: listing._id }),
    WatchlistModel.deleteMany({ listing: listing._id }),
  ]);
  for (const result of cleanup) {
    if (result.status === 'rejected') console.error('Failed to remove deleted listing references', { listingId: String(listing._id), error: result.reason });
  }
  if (publicIds.length) {
    try {
      await imageStore.deleteImages(publicIds);
    } catch (error) {
      console.error('Failed to remove deleted listing images', { listingId: String(listing._id), publicIds, error });
    }
  }
}
