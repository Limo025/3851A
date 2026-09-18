import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAssistantRequest } from '../src/assistant/contracts.js';
import { runAssistantTurn } from '../src/assistant/workflow.js';

const emptyExtraction = {
  intent: 'other', itemQuery: '', maxPrice: null, conditions: [], sellFacts: {},
};

test('a current sell intent resets incompatible buy criteria', async () => {
  const request = normalizeAssistantRequest({
    message: 'I want to sell my desk',
    state: {
      mode: 'buy',
      stage: 'awaiting_budget',
      criteria: { query: 'PS5', maxPrice: 500, conditions: ['Good'] },
      draft: {},
    },
  });
  const result = await runAssistantTurn({
    request,
    user: null,
    model: {
      extractTurn: async () => ({
        ...emptyExtraction,
        intent: 'sell',
        sellFacts: { itemName: 'Desk' },
      }),
    },
    listings: {},
  });

  assert.equal(result.state.mode, 'sell');
  assert.deepEqual(result.state.criteria, {});
  assert.deepEqual(result.state.draft, { itemName: 'Desk' });
  assert.equal(result.state.stage, 'authentication_required');
});

test('a current buy intent resets incompatible sell draft facts', async () => {
  const request = normalizeAssistantRequest({
    message: 'Find a PS5',
    state: {
      mode: 'sell',
      stage: 'awaiting_price',
      criteria: {},
      draft: { itemName: 'Desk', features: 'Oak' },
    },
  });
  const result = await runAssistantTurn({
    request,
    user: null,
    model: {
      extractTurn: async () => ({
        ...emptyExtraction,
        intent: 'buy',
        itemQuery: 'PS5',
      }),
    },
    listings: {
      summarize: async () => ({ total: 0, minPrice: null, maxPrice: null, byCondition: {} }),
    },
  });

  assert.equal(result.state.mode, 'buy');
  assert.deepEqual(result.state.criteria, { query: 'PS5' });
  assert.deepEqual(result.state.draft, {});
});
