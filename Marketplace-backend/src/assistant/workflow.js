import { assistantResponse, initialAssistantState } from './contracts.js';
import { assertConversationSafe, OUT_OF_SCOPE_MESSAGE } from './policy.js';
import { LISTING_CATEGORIES, LISTING_CONDITIONS } from '../constants/listings.js';
import { validateAssistantDraft } from '../services/listingDraft.js';

const BUY_STAGES = Object.freeze([
  'inventory_summary',
  'awaiting_budget',
  'awaiting_condition',
  'results',
]);
const SELL_FIELDS = Object.freeze(['itemName', 'features', 'condition', 'category', 'price']);

const SELL_QUESTIONS = Object.freeze({
  itemName: 'What item would you like to sell?',
  features: 'What factual features should the listing include?',
  condition: 'What is the item condition?',
  category: 'Which marketplace category fits the item?',
  price: 'What asking price would you like in AUD?',
});

export async function runAssistantTurn({ request, user, model, listings }) {
  assertConversationSafe(request);
  const extracted = await model.extractTurn(request);

  if (extracted.intent === 'other') return refusalResponse(request.state);
  if (extracted.intent === 'greeting') return greetingResponse(request.state);
  if (extracted.intent === 'buy') {
    return runBuyTurn({ request: requestForMode(request, 'buy'), extracted, listings });
  }
  if (extracted.intent === 'sell') {
    return runSellTurn({ request: requestForMode(request, 'sell'), extracted, user, model });
  }
  if (request.state.mode === 'buy') return runBuyTurn({ request, extracted, listings });
  if (request.state.mode === 'sell') return runSellTurn({ request, extracted, user, model });
  return refusalResponse(request.state);
}

function requestForMode(request, mode) {
  if (request.state.mode === null || request.state.mode === mode) return request;
  return { ...request, state: initialAssistantState() };
}

async function runBuyTurn({ request, extracted, listings }) {
  const previousQuery = request.state.criteria.query;
  const extractedQuery = normalizedString(extracted.itemQuery);
  const extractedConditions = validConditions(extracted.conditions);
  const criteria = {
    ...request.state.criteria,
    ...(extractedQuery ? { query: extractedQuery } : {}),
    ...(isNonNegativeFinite(extracted.maxPrice) ? { maxPrice: extracted.maxPrice } : {}),
    ...(extractedConditions.length ? { conditions: extractedConditions } : {}),
  };
  const baseState = { mode: 'buy', stage: request.state.stage, criteria, draft: {} };

  if (!criteria.query) {
    return assistantResponse({
      message: 'What item would you like to find?',
      state: { ...baseState, stage: 'inventory_summary' },
      listings: [],
    });
  }

  const queryChanged = Boolean(extractedQuery && extractedQuery !== previousQuery);
  const summaryAlreadyShown = request.state.mode === 'buy'
    && BUY_STAGES.includes(request.state.stage)
    && request.state.stage !== 'inventory_summary'
    && !queryChanged;
  const inventorySummary = summaryAlreadyShown
    ? undefined
    : await listings.summarize(criteria.query);

  if (inventorySummary?.total === 0) {
    return assistantResponse({
      message: `I found no matching listings for ${criteria.query}. Try a different item.`,
      state: { ...baseState, stage: 'inventory_summary' },
      inventorySummary,
      listings: [],
    });
  }

  if (!isNonNegativeFinite(criteria.maxPrice)) {
    return assistantResponse({
      message: `${summaryMessage(inventorySummary)}What is your maximum budget in AUD?`,
      state: { ...baseState, stage: 'awaiting_budget' },
      inventorySummary,
      listings: [],
    });
  }

  if (!Array.isArray(criteria.conditions) || criteria.conditions.length === 0) {
    return assistantResponse({
      message: `${summaryMessage(inventorySummary)}Which conditions would you accept: New, Like New, Good, or Fair?`,
      state: { ...baseState, stage: 'awaiting_condition' },
      inventorySummary,
      listings: [],
    });
  }

  const matches = await listings.findMatches({
    query: criteria.query,
    maxPrice: criteria.maxPrice,
    conditions: criteria.conditions,
    limit: 5,
  });
  const safeMatches = matches.slice(0, 5);
  return assistantResponse({
    message: safeMatches.length
      ? `I found ${safeMatches.length} matching listing${safeMatches.length === 1 ? '' : 's'}.`
      : 'I found no listings matching that budget and condition. Try broader criteria.',
    state: { ...baseState, stage: 'results' },
    inventorySummary,
    listings: safeMatches,
  });
}

async function runSellTurn({ request, extracted, user, model }) {
  const facts = mergeSellFacts(request.state.draft, extracted.sellFacts);
  const baseState = { mode: 'sell', stage: request.state.stage, criteria: {}, draft: facts };

  if (!user) {
    return Object.assign(assistantResponse({
      message: 'Please sign in before preparing a listing draft.',
      state: { ...baseState, stage: 'authentication_required' },
    }), { authenticationRequired: true });
  }

  const missingField = SELL_FIELDS.find((field) => !hasSellFact(facts, field));
  if (missingField) {
    return assistantResponse({
      message: SELL_QUESTIONS[missingField],
      state: { ...baseState, stage: `awaiting_${missingField}` },
    });
  }

  const copy = await model.writeListingCopy(facts);
  const draft = validateAssistantDraft({ facts, copy });
  return assistantResponse({
    message: 'Your listing draft is ready to review.',
    state: { ...baseState, stage: 'draft_ready', draft },
    draftReady: true,
  });
}

function refusalResponse(state) {
  return assistantResponse({ message: OUT_OF_SCOPE_MESSAGE, state });
}

function greetingResponse(state) {
  return assistantResponse({
    message: 'Hi! I can help you find an item or prepare a marketplace listing.',
    state,
  });
}

function mergeSellFacts(current, extracted) {
  const merged = {};
  for (const field of SELL_FIELDS) {
    const retained = validSellFact(field, current?.[field]);
    const supplied = validSellFact(field, extracted?.[field]);
    if (retained !== undefined) merged[field] = retained;
    if (supplied !== undefined) merged[field] = supplied;
  }
  return merged;
}

function validSellFact(field, value) {
  if (field === 'itemName' || field === 'features') return normalizedString(value) || undefined;
  if (field === 'condition') return LISTING_CONDITIONS.includes(value) ? value : undefined;
  if (field === 'category') return LISTING_CATEGORIES.includes(value) ? value : undefined;
  if (field === 'price') return isNonNegativeFinite(value) ? value : undefined;
  return undefined;
}

function hasSellFact(facts, field) {
  if (field === 'price') return typeof facts.price === 'number' && facts.price > 0;
  return Object.hasOwn(facts, field);
}

function validConditions(conditions) {
  if (!Array.isArray(conditions)) return [];
  return [...new Set(conditions.filter((condition) => LISTING_CONDITIONS.includes(condition)))];
}

function summaryMessage(summary) {
  if (!summary) return '';
  const range = summary.minPrice === null || summary.maxPrice === null
    ? ''
    : ` priced from A$${summary.minPrice} to A$${summary.maxPrice}`;
  return `I found ${summary.total} matching listing${summary.total === 1 ? '' : 's'}${range}. `;
}

function normalizedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isNonNegativeFinite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
