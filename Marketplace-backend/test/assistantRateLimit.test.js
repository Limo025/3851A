import test from 'node:test';
import assert from 'node:assert/strict';
import { createOptionalAuth } from '../src/middleware/optionalAuth.js';
import { createAssistantRateLimiter } from '../src/middleware/assistantRateLimit.js';

function invoke(middleware, req) {
  const response = {
    headers: {},
    statusCode: 200,
    body: undefined,
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;
  middleware(req, response, () => {
    nextCalled = true;
  });
  return { response, nextCalled };
}

test('optional auth permits an anonymous request without invoking Firebase', async () => {
  let calls = 0;
  const middleware = createOptionalAuth((_req, _res, next) => {
    calls += 1;
    next();
  });

  await new Promise((resolve) => middleware({ headers: {} }, {}, resolve));

  assert.equal(calls, 0);
});

test('optional auth verifies a supplied bearer token', async () => {
  const requests = [];
  const middleware = createOptionalAuth((req, _res, next) => {
    requests.push(req);
    req.user = { uid: 'firebase-user' };
    next();
  });
  const req = { headers: { authorization: 'Bearer id-token' } };

  await new Promise((resolve) => middleware(req, {}, resolve));

  assert.deepEqual(requests, [req]);
  assert.equal(req.user.uid, 'firebase-user');
});

test('the 21st assistant request in a minute is rate limited', () => {
  const limiter = createAssistantRateLimiter({ now: () => 1_000 });

  for (let requestNumber = 1; requestNumber <= 20; requestNumber += 1) {
    const { response, nextCalled } = invoke(limiter, { ip: '127.0.0.1' });
    assert.equal(nextCalled, true);
    assert.equal(response.statusCode, 200);
  }

  const { response, nextCalled } = invoke(limiter, { ip: '127.0.0.1' });
  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 429);
  assert.equal(response.headers['Retry-After'], '60');
  assert.deepEqual(response.body, {
    error: 'Too many assistant requests. Please try again shortly.',
  });
});

test('the assistant request counter resets after its window', () => {
  let timestamp = 1_000;
  const limiter = createAssistantRateLimiter({
    maxRequests: 1,
    windowMs: 60_000,
    now: () => timestamp,
  });

  assert.equal(invoke(limiter, { ip: 'reset-client' }).nextCalled, true);
  assert.equal(invoke(limiter, { ip: 'reset-client' }).response.statusCode, 429);

  timestamp += 60_000;
  const afterReset = invoke(limiter, { ip: 'reset-client' });
  assert.equal(afterReset.nextCalled, true);
  assert.equal(afterReset.response.statusCode, 200);
});

test('the assistant limiter evicts least-recently-used keys beyond 10,000 clients', () => {
  const limiter = createAssistantRateLimiter({ maxRequests: 1, maxKeys: 10_000, now: () => 1_000 });

  assert.equal(invoke(limiter, { ip: 'oldest-client' }).nextCalled, true);
  for (let index = 0; index < 10_000; index += 1) {
    assert.equal(invoke(limiter, { ip: `client-${index}` }).nextCalled, true);
  }

  const evictedClient = invoke(limiter, { ip: 'oldest-client' });
  assert.equal(evictedClient.nextCalled, true);
  assert.equal(evictedClient.response.statusCode, 200);
});
