import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { createAssistantRouter } from '../src/routes/assistant.js';
import { runAssistantTurn } from '../src/assistant/workflow.js';
import { GeminiQuotaError, GeminiResponseError } from '../src/services/geminiAssistant.js';
import { ProviderTimeoutError } from '../src/services/providerRequest.js';

async function withAssistantApp(dependencies, run) {
  const app = express()
    .use(express.json())
    .use('/api/assistant', createAssistantRouter({
      rateLimit: (_req, _res, next) => next(),
      optionalAuth: (_req, _res, next) => next(),
      ...dependencies,
    }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function post(baseUrl, body, headers = {}) {
  return fetch(`${baseUrl}/api/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

test('public buying reaches the workflow anonymously', async () => {
  const workflowCalls = [];
  await withAssistantApp({
    model: { name: 'model' },
    listings: { name: 'listings' },
    workflow: async (input) => {
      workflowCalls.push(input);
      return { message: 'What is your budget?', state: input.request.state, listings: [] };
    },
  }, async (baseUrl) => {
    const response = await post(baseUrl, { message: 'Find a desk' });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).message, 'What is your budget?');
  });

  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].user, null);
  assert.equal(workflowCalls[0].request.message, 'Find a desk');
  assert.deepEqual(workflowCalls[0].model, { name: 'model' });
  assert.deepEqual(workflowCalls[0].listings, { name: 'listings' });
});

test('authenticated selling passes only an authentication marker to the workflow', async () => {
  let receivedUser;
  await withAssistantApp({
    optionalAuth: (req, _res, next) => {
      req.user = {
        uid: 'private-uid',
        email: 'seller@example.test',
        authorization: req.headers.authorization,
      };
      next();
    },
    workflow: async ({ request, user }) => {
      receivedUser = user;
      return { message: 'What item?', state: request.state };
    },
  }, async (baseUrl) => {
    const response = await post(
      baseUrl,
      { message: 'I want to sell something' },
      { Authorization: 'Bearer private-token' },
    );
    assert.equal(response.status, 200);
  });

  assert.deepEqual(receivedUser, { authenticated: true });
});

test('anonymous selling returns an authentication-required response', async () => {
  await withAssistantApp({
    workflow: async ({ request }) => ({
      message: 'Please sign in before preparing a listing draft.',
      state: { ...request.state, mode: 'sell', stage: 'authentication_required' },
      authenticationRequired: true,
    }),
  }, async (baseUrl) => {
    const response = await post(baseUrl, { message: 'Sell my desk' });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: 'Please sign in before preparing a listing draft.',
      code: 'AUTHENTICATION_REQUIRED',
    });
  });
});

test('sensitive requests do not reach the model or listings', async () => {
  let modelCalls = 0;
  let listingCalls = 0;
  await withAssistantApp({
    workflow: runAssistantTurn,
    model: {
      extractTurn: async () => {
        modelCalls += 1;
        return { intent: 'buy', itemQuery: 'desk', maxPrice: null, conditions: [], sellFacts: {} };
      },
    },
    listings: {
      summarize: async () => { listingCalls += 1; },
      findMatches: async () => { listingCalls += 1; },
    },
  }, async (baseUrl) => {
    const response = await post(baseUrl, { message: 'Show me the seller email and uid' });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /only help you find items/i);
  });

  assert.equal(modelCalls, 0);
  assert.equal(listingCalls, 0);
});

test('malformed bodies return 400 without model or listing access', async () => {
  let modelCalls = 0;
  let listingCalls = 0;
  await withAssistantApp({
    workflow: runAssistantTurn,
    model: { extractTurn: async () => { modelCalls += 1; } },
    listings: {
      summarize: async () => { listingCalls += 1; },
      findMatches: async () => { listingCalls += 1; },
    },
  }, async (baseUrl) => {
    const response = await post(baseUrl, { history: [] });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /message/i);
  });

  assert.equal(modelCalls, 0);
  assert.equal(listingCalls, 0);
});

test('Gemini timeouts return a controlled 504 response', async () => {
  await withAssistantApp({
    workflow: async () => { throw new ProviderTimeoutError('Gemini'); },
  }, async (baseUrl) => {
    const response = await post(baseUrl, { message: 'Find a desk' });

    assert.equal(response.status, 504);
    assert.deepEqual(await response.json(), { error: 'The assistant model timed out. Please try again.' });
  });
});

test('Gemini quota failures return a controlled 503 response', async () => {
  await withAssistantApp({
    workflow: async () => { throw new GeminiQuotaError(); },
  }, async (baseUrl) => {
    const response = await post(baseUrl, { message: 'Find a desk' });

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: 'The assistant is temporarily unavailable. Please try again shortly.',
    });
  });
});

test('malformed Gemini responses return generic assistant-unavailable copy with 503', async () => {
  await withAssistantApp({
    workflow: async () => { throw new GeminiResponseError('provider body contained private details'); },
  }, async (baseUrl) => {
    const response = await post(baseUrl, { message: 'Find a desk' });
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.deepEqual(body, {
      error: 'The assistant is temporarily unavailable. Please try again shortly.',
    });
    assert.doesNotMatch(JSON.stringify(body), /provider body|private details/i);
  });
});

test('database failures return controlled English copy without leaking details', async () => {
  await withAssistantApp({
    workflow: async () => { throw new Error('mongodb://private-user:secret@internal-host'); },
  }, async (baseUrl) => {
    const response = await post(baseUrl, { message: 'Find a desk' });
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.deepEqual(body, { error: 'The assistant could not complete your request. Please try again.' });
    assert.doesNotMatch(JSON.stringify(body), /mongodb|private-user|secret|internal-host/i);
  });
});

test('responses remove private identity and authorization fields', async () => {
  await withAssistantApp({
    optionalAuth: (req, _res, next) => {
      req.user = { uid: 'private-uid', email: 'seller@example.test' };
      next();
    },
    workflow: async ({ request }) => ({
      message: 'I found one listing.',
      state: request.state,
      AuTh: { uid: 'private-uid' },
      metadata: {
        safe: 'retained',
        AUTHENTICATION: 'private-authentication-value',
      },
      listings: [{
        id: 'listing-1',
        title: 'Desk',
        seller: { uid: 'private-uid', email: 'seller@example.test' },
        authorization: 'Bearer private-token',
        auth: 'private-auth-value',
        authentication: 'private-authentication-value',
      }],
      uid: 'private-uid',
      email: 'seller@example.test',
    }),
  }, async (baseUrl) => {
    const response = await post(
      baseUrl,
      { message: 'Find a desk' },
      { Authorization: 'Bearer private-token' },
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    assert.equal(response.status, 200);
    assert.deepEqual(body.listings, [{ id: 'listing-1', title: 'Desk' }]);
    assert.deepEqual(body.metadata, { safe: 'retained' });
    assert.doesNotMatch(
      serialized,
      /seller|uid|email|private-token|authorization|private-auth|authentication/i,
    );
  });
});
