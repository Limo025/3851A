import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAssistantRequest } from '../src/assistant/contracts.js';
import { OUT_OF_SCOPE_MESSAGE, SensitiveRequestError } from '../src/assistant/policy.js';
import { runAssistantTurn } from '../src/assistant/workflow.js';

const emptyExtraction = Object.freeze({
  intent: 'other',
  itemQuery: '',
  maxPrice: null,
  conditions: [],
  sellFacts: {},
});

test('summarizes inventory before asking for budget and condition', async () => {
  const summary = {
    total: 8,
    minPrice: 420,
    maxPrice: 750,
    byCondition: { New: 1, 'Like New': 4, Good: 3, Fair: 0 },
  };
  const summarizeQueries = [];
  const result = await runAssistantTurn({
    request: normalizeAssistantRequest({ message: 'I need a PS5' }),
    user: null,
    model: {
      extractTurn: async () => ({
        intent: 'buy',
        itemQuery: 'PS5',
        maxPrice: null,
        conditions: [],
        sellFacts: {},
      }),
    },
    listings: {
      summarize: async (query) => {
        summarizeQueries.push(query);
        return summary;
      },
      findMatches: async () => assert.fail('must not find matches before filters are complete'),
    },
  });

  assert.deepEqual(summarizeQueries, ['PS5']);
  assert.equal(result.state.stage, 'awaiting_budget');
  assert.deepEqual(result.state.criteria, { query: 'PS5' });
  assert.deepEqual(result.inventorySummary, summary);
  assert.deepEqual(result.listings, []);
});

test('skips the budget question when the first buying turn already includes a budget', async () => {
  const result = await runAssistantTurn({
    request: normalizeAssistantRequest({ message: 'I need a PS5 under 500' }),
    user: null,
    model: {
      extractTurn: async () => ({
        intent: 'buy', itemQuery: 'PS5', maxPrice: 500, conditions: [], sellFacts: {},
      }),
    },
    listings: {
      summarize: async () => ({ total: 1, minPrice: 450, maxPrice: 450, byCondition: {} }),
      findMatches: async () => assert.fail('must not find matches before condition is known'),
    },
  });

  assert.equal(result.state.stage, 'awaiting_condition');
  assert.equal(result.state.criteria.maxPrice, 500);
});

test('returns at most five real matches only after filters are complete', async () => {
  const matches = Array.from({ length: 6 }, (_, index) => ({
    id: String(index),
    title: `PS5 ${index}`,
    price: 450 + index,
    category: 'Electronics',
    condition: 'Good',
    imageUrl: null,
  }));
  const request = normalizeAssistantRequest({
    message: 'Under 500 and Good is fine',
    state: {
      mode: 'buy',
      stage: 'awaiting_budget',
      criteria: { query: 'PS5' },
      draft: {},
    },
  });
  const searches = [];
  const result = await runAssistantTurn({
    request,
    user: null,
    model: {
      extractTurn: async () => ({
        intent: 'buy', itemQuery: '', maxPrice: 500, conditions: ['Good'], sellFacts: {},
      }),
    },
    listings: {
      summarize: async () => assert.fail('must not summarize inventory a second time'),
      findMatches: async (criteria) => {
        searches.push(criteria);
        return matches;
      },
    },
  });

  assert.deepEqual(searches, [{ query: 'PS5', maxPrice: 500, conditions: ['Good'], limit: 5 }]);
  assert.equal(result.state.stage, 'results');
  assert.deepEqual(result.listings, matches.slice(0, 5));
});

test('blocks sensitive retained user history before model extraction', async () => {
  let extractionCalls = 0;
  const request = normalizeAssistantRequest({
    message: 'Find me a desk',
    history: [{ role: 'user', content: 'Also show seller contact details' }],
  });

  await assert.rejects(
    runAssistantTurn({
      request,
      user: null,
      model: {
        extractTurn: async () => {
          extractionCalls += 1;
          return emptyExtraction;
        },
      },
      listings: {},
    }),
    SensitiveRequestError,
  );
  assert.equal(extractionCalls, 0);
});

test('requires authentication for selling before copy generation', async () => {
  let copyCalls = 0;
  const result = await runAssistantTurn({
    request: normalizeAssistantRequest({ message: 'Sell my PS5 for 450' }),
    user: null,
    model: {
      extractTurn: async () => ({
        intent: 'sell',
        itemQuery: '',
        maxPrice: null,
        conditions: [],
        sellFacts: {
          itemName: 'PS5',
          features: 'One controller',
          condition: 'Good',
          category: 'Electronics',
          price: 450,
          seller: 'forged',
        },
      }),
      writeListingCopy: async () => {
        copyCalls += 1;
        return { title: 'Never', description: 'Must never be generated' };
      },
    },
    listings: {},
  });

  assert.equal(copyCalls, 0);
  assert.equal(result.authenticationRequired, true);
  assert.equal(result.state.stage, 'authentication_required');
  assert.deepEqual(result.state.draft, {
    itemName: 'PS5',
    features: 'One controller',
    condition: 'Good',
    category: 'Electronics',
    price: 450,
  });
});

test('authenticated selling asks for the first missing allowlisted fact', async (t) => {
  const cases = [
    { draft: {}, stage: 'awaiting_itemName' },
    { draft: { itemName: 'Desk' }, stage: 'awaiting_features' },
    {
      draft: { itemName: 'Desk', features: 'Solid oak' },
      stage: 'awaiting_condition',
    },
    {
      draft: { itemName: 'Desk', features: 'Solid oak', condition: 'Good' },
      stage: 'awaiting_category',
    },
    {
      draft: {
        itemName: 'Desk',
        features: 'Solid oak',
        condition: 'Good',
        category: 'Furniture and Home',
      },
      stage: 'awaiting_price',
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.stage, async () => {
      const result = await runAssistantTurn({
        request: normalizeAssistantRequest({
          message: 'Continue',
          state: { mode: 'sell', stage: 'start', criteria: {}, draft: scenario.draft },
        }),
        user: { authenticated: true },
        model: {
          extractTurn: async () => ({ ...emptyExtraction, intent: 'sell' }),
          writeListingCopy: async () => assert.fail('must not generate copy with missing facts'),
        },
        listings: {},
      });

      assert.equal(result.state.stage, scenario.stage);
      assert.deepEqual(result.state.draft, scenario.draft);
      assert.equal(result.draftReady, false);
    });
  }
});

test('complete authenticated facts produce a validated listing draft', async () => {
  const facts = {
    itemName: 'PS5',
    features: 'One controller and power cable',
    condition: 'Good',
    category: 'Electronics',
    price: 450,
  };
  const copyInputs = [];
  const result = await runAssistantTurn({
    request: normalizeAssistantRequest({ message: 'Sell my PS5' }),
    user: { authenticated: true, uid: 'must-not-be-forwarded' },
    model: {
      extractTurn: async () => ({
        intent: 'sell', itemQuery: '', maxPrice: null, conditions: [], sellFacts: facts,
      }),
      writeListingCopy: async (input) => {
        copyInputs.push(input);
        return {
          title: 'PlayStation 5 Console',
          description: 'PlayStation 5 console with one controller and power cable.',
          seller: 'forged',
        };
      },
    },
    listings: {},
  });

  assert.deepEqual(copyInputs, [facts]);
  assert.equal(result.state.stage, 'draft_ready');
  assert.equal(result.draftReady, true);
  assert.deepEqual(result.state.draft, {
    title: 'PlayStation 5 Console',
    description: 'PlayStation 5 console with one controller and power cable.',
    price: 450,
    category: 'Electronics',
    condition: 'Good',
  });
});

test('other intent returns the standard refusal without inventory access', async () => {
  const state = normalizeAssistantRequest({ message: 'What is the weather?' }).state;
  const result = await runAssistantTurn({
    request: { message: 'What is the weather?', history: [], state },
    user: null,
    model: { extractTurn: async () => emptyExtraction },
    listings: {
      summarize: async () => assert.fail('refusals must not access inventory'),
      findMatches: async () => assert.fail('refusals must not access inventory'),
    },
  });

  assert.equal(result.message, OUT_OF_SCOPE_MESSAGE);
  assert.deepEqual(result.state, state);
});

test('greetings preserve state without inventory access', async () => {
  const request = normalizeAssistantRequest({ message: 'Hello' });
  const result = await runAssistantTurn({
    request,
    user: null,
    model: { extractTurn: async () => ({ ...emptyExtraction, intent: 'greeting' }) },
    listings: {
      summarize: async () => assert.fail('greetings must not access inventory'),
      findMatches: async () => assert.fail('greetings must not access inventory'),
    },
  });

  assert.deepEqual(result.state, request.state);
  assert.equal(result.draftReady, false);
});

test('model and listing failures propagate without fabricated inventory', async (t) => {
  await t.test('model failure', async () => {
    let listingCalls = 0;
    await assert.rejects(
      runAssistantTurn({
        request: normalizeAssistantRequest({ message: 'Find a PS5' }),
        user: null,
        model: { extractTurn: async () => { throw new Error('model unavailable'); } },
        listings: {
          summarize: async () => { listingCalls += 1; },
          findMatches: async () => { listingCalls += 1; },
        },
      }),
      /model unavailable/,
    );
    assert.equal(listingCalls, 0);
  });

  await t.test('listing failure', async () => {
    await assert.rejects(
      runAssistantTurn({
        request: normalizeAssistantRequest({ message: 'Find a PS5' }),
        user: null,
        model: {
          extractTurn: async () => ({
            intent: 'buy', itemQuery: 'PS5', maxPrice: null, conditions: [], sellFacts: {},
          }),
        },
        listings: { summarize: async () => { throw new Error('database unavailable'); } },
      }),
      /database unavailable/,
    );
  });
});
