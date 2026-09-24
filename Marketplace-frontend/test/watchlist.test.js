import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadWatchlist,
  removeFromWatchlist,
  saveToWatchlist,
  splitWatchlist,
} from '../src/utils/watchlist.js';

test('loads an authenticated watchlist page', async () => {
  const calls = [];
  const response = {
    listings: [{ _id: 'listing-1', title: 'Bike', soldAt: null }],
    page: 2,
    pages: 3,
    total: 41,
  };

  const result = await loadWatchlist(2, async (path, options) => {
    calls.push({ path, options });
    return response;
  });

  assert.deepEqual(calls, [{ path: '/api/watchlist?page=2&limit=20', options: { auth: true } }]);
  assert.deepEqual(result, response);
});

test('separates available and sold watchlist items', () => {
  const available = { _id: 'available', soldAt: null };
  const sold = { _id: 'sold', soldAt: '2026-09-24T00:00:00.000Z' };

  assert.deepEqual(splitWatchlist([available, sold]), {
    available: [available],
    unavailable: [sold],
  });
});

test('adds and removes a listing with authenticated watchlist requests', async () => {
  const calls = [];
  const request = async (path, options) => calls.push({ path, options });

  await saveToWatchlist('listing/1', request);
  await removeFromWatchlist('listing/1', request);

  assert.deepEqual(calls, [
    { path: '/api/watchlist/listing%2F1', options: { method: 'PUT', auth: true } },
    { path: '/api/watchlist/listing%2F1', options: { method: 'DELETE', auth: true } },
  ]);
});
