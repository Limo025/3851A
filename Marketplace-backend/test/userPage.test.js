import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import User from '../src/models/User.js';
import Rating from '../src/models/Rating.js';
import users, { createUsersRouter } from '../src/routes/users.js';
import { Conversation } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
import appeals from '../src/routes/appeals.js';

test('public profile hides private fields and banned sellers have no available listings', async () => {
  const originalFind = User.findById;
  const originalAggregate = Rating.aggregate;
  User.findById = async () => ({ _id: '507f1f77bcf86cd799439011', uid: 'private', email: 'private@example.com', username: 'Seller', isBanned: true });
  Rating.aggregate = async () => [{ average: 4, count: 2 }];
  const server = express().use(express.json()).use('/users', users).use('/appeals', appeals).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/users/507f1f77bcf86cd799439011`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.username, 'Seller');
    assert.equal(body.uid, undefined);
    assert.equal(body.email, undefined);
    assert.deepEqual(body.listings, []);
    assert.deepEqual(body.rating, { average: 4, count: 2 });
    assert.equal((await fetch(`${base}/users/invalid`)).status, 400);
    assert.equal((await fetch(`${base}/users/507f1f77bcf86cd799439011/rating`, { method: 'PUT' })).status, 401);
    assert.equal((await fetch(`${base}/appeals`, { method: 'POST' })).status, 401);
  } finally {
    User.findById = originalFind; Rating.aggregate = originalAggregate;
    await new Promise(resolve => server.close(resolve));
  }
});

test('rating requires an actual buyer message, validates stars, and derives reviewer from auth', async () => {
  const originals = [User.findById, Conversation.find, Message.exists, Rating.updateOne];
  const id = '507f1f77bcf86cd799439011';
  let sent = false;
  let write;
  User.findById = async () => ({ _id: id, uid: 'seller' });
  Conversation.find = () => ({ select() { return this; }, lean: async () => [{ _id: id }] });
  Message.exists = async query => { assert.equal(query.senderId, 'buyer'); return sent; };
  Rating.updateOne = async (filter, update) => { write = { filter, update }; };
  const router = createUsersRouter({ authenticate(req, res, next) { req.user = { uid: 'buyer' }; req.currentUser = { _id: 'buyer-db-id' }; next(); } });
  const server = express().use(express.json()).use(router).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/${id}/rating`;
  const send = score => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score, reviewer: 'forged' }) });
  try {
    assert.equal((await send(6)).status, 400);
    assert.equal((await send(4)).status, 403);
    sent = true;
    assert.equal((await send(4)).status, 200);
    assert.equal(write.filter.reviewer, 'buyer-db-id');
    assert.equal(write.update.$set.score, 4);
    User.findById = async () => ({ _id: id, uid: 'buyer' });
    assert.equal((await send(4)).status, 403);
  } finally {
    [User.findById, Conversation.find, Message.exists, Rating.updateOne] = originals;
    await new Promise(resolve => server.close(resolve));
  }
});
