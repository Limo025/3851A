import assert from 'node:assert/strict';
import test from 'node:test';
import { Conversation } from '../src/models/Conversation.js';
import { buildTransactionSnapshot, confirmTransaction, getTransactionHistory } from '../src/controllers/messageController.js';

const query = (value) => ({ populate() { return this; }, sort() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } });

test('conversation stores one confirmation and a bounded listing snapshot', () => {
  assert.ok(Conversation.schema.path('transactionConfirmedAt'));
  assert.ok(Conversation.schema.path('transactionConfirmedBy'));
  assert.ok(Conversation.schema.path('transactionSnapshot.title'));
  assert.deepEqual(buildTransactionSnapshot({
    _id: '507f1f77bcf86cd799439011', title: 'Desk', price: 45,
    images: [{ url: 'https://example.com/desk.jpg', publicId: 'desk' }], quantity: 9, soldAt: null,
  }), { listingId: '507f1f77bcf86cd799439011', title: 'Desk', price: 45, imageUrl: 'https://example.com/desk.jpg' });
});

test('confirmation is participant-only and keeps the first confirmed result', async () => {
  const originalFindOne = Conversation.findOne;
  const originalFindOneAndUpdate = Conversation.findOneAndUpdate;
  const existing = { _id: 'c1', buyer: 'buyer', seller: 'seller', listing: { _id: '507f1f77bcf86cd799439011', title: 'Desk', price: 45, images: [] } };
  const confirmed = { ...existing, transactionConfirmedAt: new Date(), transactionConfirmedBy: 'buyer' };
  let updateCalls = 0;
  Conversation.findOne = () => query(updateCalls ? confirmed : existing);
  Conversation.findOneAndUpdate = () => { updateCalls += 1; return query(updateCalls === 1 ? confirmed : null); };
  try {
    const first = response();
    await confirmTransaction({ user: { uid: 'buyer' }, params: { conversationId: 'c1' } }, first);
    assert.equal(first.body.transactionConfirmedBy, 'buyer');
    const second = response();
    await confirmTransaction({ user: { uid: 'seller' }, params: { conversationId: 'c1' } }, second);
    assert.equal(second.body.transactionConfirmedBy, 'buyer');
    Conversation.findOne = () => query(null);
    const outsider = response();
    await confirmTransaction({ user: { uid: 'outsider' }, params: { conversationId: 'c1' } }, outsider);
    assert.equal(outsider.statusCode, 404);
  } finally { Conversation.findOne = originalFindOne; Conversation.findOneAndUpdate = originalFindOneAndUpdate; }
});

test('transaction history rejects roles other than buyer or seller', async () => {
  const res = response();
  await getTransactionHistory({ user: { uid: 'buyer' }, query: { role: 'admin' } }, res);
  assert.equal(res.statusCode, 400);
});

test('transaction history is capped and paginated for the authenticated role', async () => {
  const originalFind = Conversation.find;
  const originalCount = Conversation.countDocuments;
  const calls = [];
  const pagedQuery = {
    sort(value) { calls.push(['sort', value]); return this; },
    skip(value) { calls.push(['skip', value]); return this; },
    limit(value) { calls.push(['limit', value]); return this; },
    populate() { return this; },
    then(resolve, reject) { return Promise.resolve([{ _id: 'c1' }]).then(resolve, reject); },
  };
  Conversation.find = (filter) => { calls.push(['filter', filter]); return pagedQuery; };
  Conversation.countDocuments = async () => 41;
  try {
    const res = response();
    await getTransactionHistory({ user: { uid: 'buyer' }, query: { role: 'buyer', page: '2' } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { transactions: [{ _id: 'c1' }], page: 2, pages: 3, total: 41 });
    assert.ok(calls.some(([name, value]) => name === 'skip' && value === 20));
    assert.ok(calls.some(([name, value]) => name === 'limit' && value === 20));
  } finally { Conversation.find = originalFind; Conversation.countDocuments = originalCount; }
});
