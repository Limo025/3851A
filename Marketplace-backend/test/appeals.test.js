import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { createAppealsRouter } from '../src/routes/appeals.js';
import { createAdminRouter } from '../src/routes/admin.js';

const id = '507f1f77bcf86cd799439011';
test('appeals are stored without SMTP and only admins can review a pending appeal', async () => {
  let pending = false;
  let banned = true;
  const UserModel = {
    findOne: async () => ({ _id: id, isBanned: banned }),
    findOneAndUpdate: async (filter, update) => {
      if (filter['appeal.status'] === 'pending') {
        if (!pending) return null;
        pending = false;
        if (update.$set.isBanned === false) banned = false;
      } else {
        assert.equal(filter.isBanned, true);
        assert.equal(update.$set.appeal.reason.length, 25);
        if (pending) return null;
        pending = true;
      }
      return { isBanned: banned };
    },
  };
  const app = express().use(express.json());
  app.use('/appeals', createAppealsRouter({ UserModel, verifyAppealToken: async token => token === 'valid' ? { uid: 'buyer' } : null }));
  app.use('/admin', createAdminRouter({ UserModel, authenticate: (req, res, next) => { req.user = { uid: req.headers['x-uid'] }; next(); }, getAdminUids: () => new Set(['admin']) }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const send = (path, body, headers = {}, method = 'POST') => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  try {
    assert.equal((await send('/appeals', { reason: 'a'.repeat(25) })).status, 401);
    const auth = { Authorization: 'Bearer valid' };
    assert.equal((await send('/appeals', { reason: 'short' }, auth)).status, 400);
    assert.equal((await send('/appeals', { reason: 'a'.repeat(25) }, auth)).status, 200);
    assert.equal((await send('/appeals', { reason: 'a'.repeat(25) }, auth)).status, 429);
    assert.equal((await send(`/admin/appeals/${id}`, { status: 'approved' }, { 'x-uid': 'buyer' }, 'PATCH')).status, 403);
    assert.equal((await send(`/admin/appeals/${id}`, { status: 'bad' }, { 'x-uid': 'admin' }, 'PATCH')).status, 400);
    assert.equal((await send(`/admin/appeals/${id}`, { status: 'rejected' }, { 'x-uid': 'admin' }, 'PATCH')).status, 200);
    assert.equal(banned, true);
    assert.equal((await send(`/admin/appeals/${id}`, { status: 'approved' }, { 'x-uid': 'admin' }, 'PATCH')).status, 409);
    pending = true;
    assert.equal((await send(`/admin/appeals/${id}`, { status: 'approved' }, { 'x-uid': 'admin' }, 'PATCH')).status, 200);
    assert.equal(banned, false);
    assert.equal((await send('/appeals', { reason: 'a'.repeat(25) }, auth)).status, 403);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
