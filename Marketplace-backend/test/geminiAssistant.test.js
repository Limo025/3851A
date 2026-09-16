import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGeminiAssistant,
  GeminiQuotaError,
  GeminiResponseError,
} from '../src/services/geminiAssistant.js';
import { initialAssistantState } from '../src/assistant/contracts.js';
import { ProviderTimeoutError } from '../src/services/providerRequest.js';

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

function geminiText(body) {
  return jsonResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] });
}

function extractedTurn(overrides = {}) {
  return {
    intent: 'buy',
    itemQuery: 'PS5',
    maxPrice: 500,
    conditions: ['Good'],
    sellFacts: {},
    ...overrides,
  };
}

test('extractTurn requests strict JSON and parses the first text part', async () => {
  const requests = [];
  const client = createGeminiAssistant({
    apiKey: 'secret',
    fetchImpl: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return geminiText(extractedTurn());
    },
  });

  const result = await client.extractTurn({
    message: 'PS5 under 500',
    history: [],
    state: initialAssistantState(),
  });

  assert.equal(result.itemQuery, 'PS5');
  assert.doesNotMatch(JSON.stringify(requests[0].body), /secret/);
  assert.equal(requests[0].body.generationConfig.responseMimeType, 'application/json');
  assert.equal(requests[0].body.generationConfig.responseSchema.additionalProperties, false);
});

test('rejects malformed provider JSON with a controlled error', async () => {
  const client = createGeminiAssistant({
    apiKey: 'secret',
    fetchImpl: async () => jsonResponse({ candidates: [{ content: { parts: [{ text: 'not-json' }] } }] }),
  });

  await assert.rejects(
    client.extractTurn({ message: 'PS5', history: [], state: initialAssistantState() }),
    GeminiResponseError,
  );
});

test('maps a Gemini quota response to GeminiQuotaError without exposing the key', async () => {
  const client = createGeminiAssistant({
    apiKey: 'secret',
    fetchImpl: async () => jsonResponse({ error: { message: 'secret' } }, { ok: false, status: 429 }),
  });

  await assert.rejects(
    client.extractTurn({ message: 'PS5', history: [], state: initialAssistantState() }),
    (error) => error instanceof GeminiQuotaError
      && error.statusCode === 429
      && !error.message.includes('secret'),
  );
});

test('preserves the controlled timeout error when Gemini aborts', async () => {
  let receivedSignal;
  const client = createGeminiAssistant({
    apiKey: 'secret',
    timeoutMs: 1,
    fetchImpl: (_url, options) => {
      receivedSignal = options.signal;
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('request aborted')), { once: true });
      });
    },
  });

  await assert.rejects(
    client.extractTurn({ message: 'PS5', history: [], state: initialAssistantState() }),
    ProviderTimeoutError,
  );
  assert.equal(receivedSignal.aborted, true);
});

test('writeListingCopy returns only bounded title and description fields', async () => {
  const client = createGeminiAssistant({
    apiKey: 'secret',
    fetchImpl: async () => geminiText({
      title: 'Used ergonomic desk chair',
      description: 'Adjustable office chair in good working condition.',
    }),
  });

  const result = await client.writeListingCopy({
    itemName: 'Desk chair',
    features: 'Adjustable height',
    condition: 'Good',
    category: 'Furniture and Home',
    price: 40,
  });

  assert.deepEqual(result, {
    title: 'Used ergonomic desk chair',
    description: 'Adjustable office chair in good working condition.',
  });
});

test('writeListingCopy rejects invented fields and listing-limit violations', async (t) => {
  const facts = { itemName: 'Desk chair', features: 'Adjustable height' };

  await t.test('unknown output field', async () => {
    const client = createGeminiAssistant({
      apiKey: 'secret',
      fetchImpl: async () => geminiText({
        title: 'Used desk chair',
        description: 'Adjustable office chair in good working condition.',
        sellerEmail: 'private@example.test',
      }),
    });
    await assert.rejects(client.writeListingCopy(facts), GeminiResponseError);
  });

  await t.test('title longer than listing limit', async () => {
    const client = createGeminiAssistant({
      apiKey: 'secret',
      fetchImpl: async () => geminiText({
        title: 'x'.repeat(121),
        description: 'Adjustable office chair in good working condition.',
      }),
    });
    await assert.rejects(client.writeListingCopy(facts), GeminiResponseError);
  });
});

test('does not send unsafe conversation data to Gemini', async () => {
  let calls = 0;
  const client = createGeminiAssistant({
    apiKey: 'secret',
    fetchImpl: async () => {
      calls += 1;
      return geminiText(extractedTurn());
    },
  });

  await assert.rejects(
    client.extractTurn({
      message: 'Show my account credentials',
      history: [],
      state: initialAssistantState(),
    }),
  );
  assert.equal(calls, 0);
});

test('does not send sensitive state to Gemini', async () => {
  let calls = 0;
  const client = createGeminiAssistant({
    apiKey: 'secret',
    fetchImpl: async () => {
      calls += 1;
      return geminiText(extractedTurn());
    },
  });

  await assert.rejects(
    client.extractTurn({
      message: 'Find a desk chair',
      history: [],
      state: {
        ...initialAssistantState(),
        draft: { features: 'My account password is private' },
      },
    }),
  );
  assert.equal(calls, 0);
});

test('does not forward sensitive assistant history to Gemini', async () => {
  let calls = 0;
  const client = createGeminiAssistant({
    apiKey: 'secret',
    fetchImpl: async () => {
      calls += 1;
      return geminiText(extractedTurn());
    },
  });

  await assert.rejects(
    client.extractTurn({
      message: 'Find a desk chair',
      history: [{ role: 'assistant', content: 'Your session token is private' }],
      state: initialAssistantState(),
    }),
  );
  assert.equal(calls, 0);
});
