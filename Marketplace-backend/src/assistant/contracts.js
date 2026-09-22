import { LISTING_CATEGORIES, LISTING_CONDITIONS } from '../constants/listings.js';

export const ASSISTANT_LIMITS = Object.freeze({
  message: 1000,
  historyItems: 10,
  historyMessage: 1000,
});

export const ASSISTANT_STAGES = Object.freeze([
  'start',
  'inventory_summary',
  'awaiting_budget',
  'awaiting_condition',
  'results',
  'awaiting_itemName',
  'awaiting_features',
  'awaiting_category',
  'awaiting_price',
  'draft_ready',
  'authentication_required',
]);

const HISTORY_ROLES = new Set(['user', 'assistant']);
const MAX_QUERY_LENGTH = 100;
const MAX_DRAFT_ITEM_NAME_LENGTH = 120;
const MAX_DRAFT_FEATURES_LENGTH = 5000;

export class AssistantInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssistantInputError';
  }
}

export function initialAssistantState() {
  return { mode: null, stage: 'start', criteria: {}, draft: {} };
}

export function normalizeAssistantRequest(body = {}) {
  const input = isPlainObject(body) ? body : {};
  const message = typeof input.message === 'string' ? input.message.trim() : '';

  if (!message || message.length > ASSISTANT_LIMITS.message) {
    throw new AssistantInputError('Message is required and must be at most 1000 characters');
  }

  return {
    message,
    history: normalizeHistory(input.history),
    state: normalizeState(input.state),
  };
}

export function assistantResponse({ message, state, inventorySummary, listings, draftReady = false }) {
  return Object.fromEntries(
    Object.entries({ message, state, inventorySummary, listings, draftReady })
      .filter(([, value]) => value !== undefined),
  );
}

function normalizeHistory(history) {
  if (history === undefined) return [];
  if (!Array.isArray(history) || history.length > ASSISTANT_LIMITS.historyItems) {
    throw new AssistantInputError('History must contain at most 10 messages');
  }

  return history.map((entry) => {
    if (!isPlainObject(entry) || !HISTORY_ROLES.has(entry.role) || typeof entry.content !== 'string') {
      throw new AssistantInputError('History entries must have a user or assistant role and text content');
    }

    const content = entry.content.trim();
    if (!content || content.length > ASSISTANT_LIMITS.historyMessage) {
      throw new AssistantInputError('History messages must be between 1 and 1000 characters');
    }
    return { role: entry.role, content };
  });
}

function normalizeState(state) {
  if (!isPlainObject(state)) return initialAssistantState();
  const mode = ['buy', 'sell', null].includes(state.mode) ? state.mode : null;
  const stage = ASSISTANT_STAGES.includes(state.stage) ? state.stage : 'start';

  if (state.mode !== undefined && mode === null && state.mode !== null) return initialAssistantState();
  if (state.stage !== undefined && stage === 'start' && state.stage !== 'start') return initialAssistantState();

  return {
    mode,
    stage,
    criteria: normalizeCriteria(state.criteria),
    draft: normalizeDraft(state.draft),
  };
}

function normalizeCriteria(criteria) {
  if (!isPlainObject(criteria)) return {};
  const normalized = {};
  const query = boundedString(criteria.query, MAX_QUERY_LENGTH);
  if (query) normalized.query = query;
  if (isNonNegativeFinite(criteria.maxPrice)) normalized.maxPrice = criteria.maxPrice;
  if (isNonNegativeFinite(criteria.minPrice)) normalized.minPrice = criteria.minPrice;

  if (Array.isArray(criteria.conditions)) {
    const conditions = [...new Set(criteria.conditions.filter((condition) => LISTING_CONDITIONS.includes(condition)))];
    if (conditions.length) normalized.conditions = conditions;
  }
  if (LISTING_CATEGORIES.includes(criteria.category)) normalized.category = criteria.category;
  return normalized;
}

function normalizeDraft(draft) {
  if (!isPlainObject(draft)) return {};
  const normalized = {};
  const itemName = boundedString(draft.itemName, MAX_DRAFT_ITEM_NAME_LENGTH);
  const features = boundedString(draft.features, MAX_DRAFT_FEATURES_LENGTH);
  if (itemName) normalized.itemName = itemName;
  if (features) normalized.features = features;
  if (LISTING_CONDITIONS.includes(draft.condition)) normalized.condition = draft.condition;
  if (LISTING_CATEGORIES.includes(draft.category)) normalized.category = draft.category;
  if (isNonNegativeFinite(draft.price)) normalized.price = draft.price;
  return normalized;
}

function boundedString(value, maximum) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : '';
}

function isNonNegativeFinite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
