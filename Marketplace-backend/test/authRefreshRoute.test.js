import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { createAuthRouter } from '../src/routes/auth.js';

async function withAuthApp(fetchImpl, run, options = {}) {
  const app = express().use(express.json()).use('/auth', createAuthRouter({
    firebaseAuth: {},
    fetchImpl,
    ...options,
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('POST /auth/refresh normalizes Firebase token data', async () => {
  const calls = [];
  await withAuthApp(async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => ({ id_token: 'new-id', refresh_token: 'new-refresh', expires_in: '3600' }),
    };
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'old-refresh' }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      idToken: 'new-id',
      refreshToken: 'new-refresh',
      expiresIn: '3600',
    });
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/securetoken\.googleapis\.com\/v1\/token\?key=/);
  assert.equal(calls[0].options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.equal(calls[0].options.body, 'grant_type=refresh_token&refresh_token=old-refresh');
});

test('POST /auth/refresh rejects a missing refresh token', async () => {
  let called = false;
  await withAuthApp(async () => {
    called = true;
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /refresh token/i);
  });
  assert.equal(called, false);
});

test('POST /auth/refresh rejects missing, non-string, and blank refresh token bodies', async () => {
  let called = false;
  await withAuthApp(async () => {
    called = true;
  }, async (baseUrl) => {
    const requests = [
      undefined,
      { refreshToken: 123 },
      { refreshToken: {} },
      { refreshToken: '   ' },
    ];

    for (const body of requests) {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        ...(body === undefined ? {} : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      });

      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: 'Refresh token is required' });
    }
  });
  assert.equal(called, false);
});

test('POST /auth/refresh rejects successful Firebase responses missing an ID token', async () => {
  await withAuthApp(async () => ({
    ok: true,
    json: async () => ({ refresh_token: 'new-refresh', expires_in: '3600' }),
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'old-refresh' }),
    });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Unable to refresh session' });
  });
});

test('POST /auth/refresh rejects successful Firebase responses with an invalid expiry', async () => {
  await withAuthApp(async () => ({
    ok: true,
    json: async () => ({ id_token: 'new-id', refresh_token: 'new-refresh', expires_in: 'not-a-duration' }),
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'old-refresh' }),
    });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Unable to refresh session' });
  });
});

test('POST /auth/refresh reports Firebase rejection as unauthorized', async () => {
  await withAuthApp(async () => ({ ok: false, json: async () => ({ error: { message: 'INVALID_REFRESH_TOKEN' } }) }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'invalid' }),
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Unable to refresh session' });
  });
});

test('POST /auth/refresh reports network failures without leaking details', async () => {
  await withAuthApp(async () => { throw new Error('network is unavailable'); }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'old-refresh' }),
    });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Unable to refresh session' });
  });
});

test('POST /auth/refresh aborts provider requests at the configured timeout and returns a controlled response', async () => {
  let receivedSignal;
  await withAuthApp((_url, options) => {
    receivedSignal = options.signal;
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted by timeout')), { once: true });
    });
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'old-refresh' }),
    });

    assert.equal(response.status, 504);
    assert.deepEqual(await response.json(), { error: 'Authentication provider timed out' });
  }, { timeoutMs: 1 });
  assert.equal(receivedSignal?.aborted, true);
});

test('POST /auth/login aborts provider requests at the configured timeout and returns a controlled response', async () => {
  let receivedSignal;
  await withAuthApp((_url, options) => {
    receivedSignal = options.signal;
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted by timeout')), { once: true });
    });
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'seller@example.test', password: 'password' }),
    });

    assert.equal(response.status, 504);
    assert.deepEqual(await response.json(), { error: 'Authentication provider timed out' });
  }, { timeoutMs: 1 });
  assert.equal(receivedSignal?.aborted, true);
});
