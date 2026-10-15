import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTransactionHistory } from '../src/utils/transactionHistory.js';

test('transaction history requests the exact selected role', async () => {
  const calls = [];
  const request = async (...args) => { calls.push(args); return { transactions: [{ id: 1 }], page: 2, pages: 3, total: 41 }; };
  assert.deepEqual(await loadTransactionHistory('buyer', 2, request), { transactions: [{ id: 1 }], page: 2, pages: 3, total: 41 });
  assert.deepEqual(calls[0], ['/api/chat/transaction-history?role=buyer&page=2', { auth: true }]);
  await loadTransactionHistory('seller', 1, request);
  assert.equal(calls[1][0], '/api/chat/transaction-history?role=seller&page=1');
});

test('transaction history rejects invalid roles before requesting and normalizes bad payloads', async () => {
  let called = false;
  await assert.rejects(() => loadTransactionHistory('admin', 1, async () => { called = true; }), /buyer or seller/);
  assert.equal(called, false);
  assert.deepEqual(await loadTransactionHistory('buyer', 1, async () => ({})), { transactions: [], page: 1, pages: 1, total: 0 });
});
