import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthenticationError, createSessionManager } from '../src/auth/session.js';
import { ApiError, createApiClient } from '../src/api/client.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function createClock(initial = 1_000_000) {
  let value = initial;
  return {
    now: () => value,
    advance: (milliseconds) => { value += milliseconds; },
  };
}

test('session returns a stored access token until it needs refreshing', async () => {
  const storage = createStorage();
  const clock = createClock();
  const fetchCalls = [];
  const manager = createSessionManager({
    storage,
    now: clock.now,
    fetchImpl: async (url, options) => {
      fetchCalls.push({ url, options });
      return {
        ok: true,
        json: async () => ({ idToken: 'new-id', refreshToken: 'new-refresh', expiresIn: '3600' }),
      };
    },
  });

  manager.saveLogin({ idToken: 'old', refreshToken: 'refresh', expiresIn: '3600' });
  assert.equal(await manager.getAccessToken(), 'old');

  clock.advance(3_601_000);
  assert.equal(await manager.getAccessToken(), 'new-id');
  assert.equal(storage.getItem('marketplace.auth') !== null, true);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, 'http://localhost:8000/auth/refresh');
  assert.equal(fetchCalls[0].options.body, JSON.stringify({ refreshToken: 'refresh' }));
});

test('session clears itself and throws AuthenticationError when refresh fails', async () => {
  const storage = createStorage();
  const clock = createClock();
  const manager = createSessionManager({
    storage,
    now: clock.now,
    fetchImpl: async () => ({ ok: false, json: async () => ({ error: 'Unable to refresh session' }) }),
  });

  manager.saveLogin({ idToken: 'old', refreshToken: 'refresh', expiresIn: '1' });
  clock.advance(2_000);

  await assert.rejects(manager.getAccessToken(), AuthenticationError);
  assert.equal(manager.hasSession(), false);
  assert.equal(storage.getItem('marketplace.auth'), null);
});

test('session module can be imported without browser storage', async () => {
  const manager = createSessionManager();
  assert.equal(manager.hasSession(), false);
  manager.saveLogin({ idToken: 'id', refreshToken: 'refresh', expiresIn: '3600' });
  assert.equal(await manager.getAccessToken(), null);
});

test('api client refreshes and attaches the bearer token for authenticated JSON requests', async () => {
  const calls = [];
  const apiFetch = createApiClient({
    baseUrl: 'http://api.test',
    sessionManager: { getAccessToken: async () => 'refreshed-token' },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => ({ saved: true }) };
    },
  });

  assert.deepEqual(await apiFetch('/listings', { method: 'POST', auth: true, body: { title: 'Desk' } }), { saved: true });
  assert.equal(calls[0].url, 'http://api.test/listings');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer refreshed-token');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
  assert.equal(calls[0].options.body, JSON.stringify({ title: 'Desk' }));
});

test('api client preserves FormData headers and exposes server errors', async () => {
  const form = new FormData();
  form.set('image', 'data');
  const apiFetch = createApiClient({
    baseUrl: 'http://api.test',
    fetchImpl: async (_url, options) => {
      assert.equal(options.headers['Content-Type'], undefined);
      assert.equal(options.body, form);
      return { ok: false, status: 422, headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => ({ error: 'Upload failed' }) };
    },
  });

  await assert.rejects(apiFetch('/upload', { method: 'POST', body: form }), (error) => {
    assert.equal(error instanceof ApiError, true);
    assert.equal(error.status, 422);
    assert.equal(error.message, 'Upload failed');
    return true;
  });
});
