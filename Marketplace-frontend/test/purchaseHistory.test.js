import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBuyerPurchaseHistory } from '../src/utils/purchaseHistory.js';

test('loads only available listings from buyer conversations', async () => {
  const calls = [];
  const request = async (path, options) => {
    calls.push({ path, options });
    return [
      { _id: 'conversation-1', listing: { _id: 'listing-1', title: 'Bike', price: 20, images: [] } },
      { _id: 'conversation-2', listing: null },
    ];
  };

  const listings = await loadBuyerPurchaseHistory(request);

  assert.deepEqual(calls, [{ path: '/api/chat?role=buyer', options: { auth: true } }]);
  assert.deepEqual(listings, [
    { _id: 'listing-1', title: 'Bike', price: 20, images: [] },
  ]);
});

test('returns no listings when the conversation response is malformed', async () => {
  const listings = await loadBuyerPurchaseHistory(async () => ({ conversations: [] }));

  assert.deepEqual(listings, []);
});
