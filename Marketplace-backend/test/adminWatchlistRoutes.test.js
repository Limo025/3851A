import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { createAdminRouter } from '../src/routes/admin.js';
import { createWatchlistRouter } from '../src/routes/watchlist.js';

const id = '507f1f77bcf86cd799439011';
const auth = (req, res, next) => {
  const uid = req.headers['x-uid'];
  if (!uid) return res.status(401).end();
  req.user = { uid };
  req.currentUser = { _id: uid };
  return next();
};

async function withRouter(path, router, run) {
  const server = express().use(express.json()).use(path, router).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await run(`http://127.0.0.1:${server.address().port}${path}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('admin routes reject non-admins, protect admins, and ban ordinary users', async () => {
  const closed = [];
  const user = { _id: id, uid: 'buyer', isBanned: false, async save() {} };
  const router = createAdminRouter({
    authenticate: auth,
    getAdminUids: () => new Set(['admin']),
    UserModel: { findById: async () => user },
    closeUserConnections: (uid) => closed.push(uid),
  });
  await withRouter('/api/admin', router, async (base) => {
    const url = `${base}/users/${id}/ban`;
    const send = (uid, banned) => fetch(url, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(uid ? { 'x-uid': uid } : {}) },
      body: JSON.stringify({ banned }),
    });
    assert.equal((await send(null, true)).status, 401);
    assert.equal((await send('buyer', true)).status, 403);
    assert.equal((await send('admin', 'yes')).status, 400);
    const banned = await send('admin', true);
    assert.equal(banned.status, 200);
    assert.equal((await banned.json()).message, 'User banned successfully');
    assert.equal(user.isBanned, true);
    assert.deepEqual(closed, ['buyer']);
    const unbanned = await send('admin', false);
    assert.equal(unbanned.status, 200);
    assert.equal((await unbanned.json()).message, 'User unbanned successfully');
    assert.equal(user.isBanned, false);
    user.uid = 'admin';
    assert.equal((await send('admin', true)).status, 403);
  });
});

test('admin listing deletion uses the shared deletion path', async () => {
  const removed = [];
  const listing = { _id: id };
  await withRouter('/api/admin', createAdminRouter({
    authenticate: auth,
    getAdminUids: () => new Set(['admin']),
    ListingModel: { findById: async () => listing },
    removeListing: async (value) => removed.push(value),
  }), async (base) => {
    const response = await fetch(`${base}/listings/${id}`, { method: 'DELETE', headers: { 'x-uid': 'admin' } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { message: 'Listing deleted successfully', listingId: id });
  });
  assert.deepEqual(removed, [listing]);
});

test('watchlist derives the owner from authentication and rejects sold listings', async () => {
  const calls = [];
  let soldAt = null;
  const router = createWatchlistRouter({
    authenticate: auth,
    ListingModel: { findById: async () => ({ _id: id, soldAt }) },
    WatchlistModel: {
      updateOne: async (...args) => calls.push(args),
      deleteOne: async (filter) => calls.push(filter),
    },
  });
  await withRouter('/api/watchlist', router, async (base) => {
    const put = (uid) => fetch(`${base}/${id}`, { method: 'PUT', headers: uid ? { 'x-uid': uid } : {} });
    assert.equal((await put(null)).status, 401);
    assert.equal((await put('buyer')).status, 204);
    assert.deepEqual(calls[0][0], { user: 'buyer', listing: id });
    soldAt = new Date();
    assert.equal((await put('buyer')).status, 409);
    assert.equal((await fetch(`${base}/${id}`, { method: 'DELETE', headers: { 'x-uid': 'buyer' } })).status, 204);
    assert.deepEqual(calls[1], { user: 'buyer', listing: id });
  });
});
