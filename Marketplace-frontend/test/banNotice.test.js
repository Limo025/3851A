import assert from 'node:assert/strict';
import test from 'node:test';
import { createAppealContextManager } from '../src/auth/banNotice.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('appeal context persists its token and ban reason for the current tab', () => {
  const storage = createStorage();
  const firstManager = createAppealContextManager({ storage, now: () => 1_000 });
  firstManager.save('appeal-token', 'Marketplace policy violation', 60);

  const afterReload = createAppealContextManager({ storage, now: () => 2_000 });
  assert.equal(afterReload.getToken(), 'appeal-token');
  assert.equal(afterReload.getReason(), 'Marketplace policy violation');
});

test('appeal context removes expired and malformed data', () => {
  const storage = createStorage();
  const manager = createAppealContextManager({ storage, now: () => 1_000 });
  manager.save('appeal-token', 'Reason', 1);

  const expiredManager = createAppealContextManager({ storage, now: () => 2_001 });
  assert.equal(expiredManager.getToken(), null);
  assert.equal(storage.getItem('marketplace.appeal'), null);

  storage.setItem('marketplace.appeal', '{invalid');
  assert.equal(expiredManager.getToken(), null);
  assert.equal(storage.getItem('marketplace.appeal'), null);
});

test('clearing appeal context removes only appeal data', () => {
  const storage = createStorage();
  storage.setItem('marketplace.auth', 'normal-session');
  const manager = createAppealContextManager({ storage });
  manager.save('appeal-token', 'Reason');
  manager.clear();

  assert.equal(manager.getToken(), null);
  assert.equal(storage.getItem('marketplace.auth'), 'normal-session');
});
