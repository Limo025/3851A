import { apiFetch } from '../api/client.js';

export async function loadWatchlist(page = 1, request = apiFetch) {
  return request(`/api/watchlist?page=${page}&limit=20`, { auth: true });
}

export function splitWatchlist(listings) {
  return (Array.isArray(listings) ? listings : []).reduce((groups, listing) => {
    groups[listing.soldAt ? 'unavailable' : 'available'].push(listing);
    return groups;
  }, { available: [], unavailable: [] });
}

export function saveToWatchlist(listingId, request = apiFetch) {
  return request(`/api/watchlist/${encodeURIComponent(listingId)}`, { method: 'PUT', auth: true });
}

export function removeFromWatchlist(listingId, request = apiFetch) {
  return request(`/api/watchlist/${encodeURIComponent(listingId)}`, { method: 'DELETE', auth: true });
}
