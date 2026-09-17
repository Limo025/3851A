import { LISTING_CATEGORIES, LISTING_CONDITIONS } from '../utils/listingForm.js';

export function listingDraftFromLocationState(state) {
  if (!isPlainObject(state) || !isPlainObject(state.assistantDraft)) return undefined;

  const { title, description, price: rawPrice, category, condition } = state.assistantDraft;
  const price = typeof rawPrice === 'number' || typeof rawPrice === 'string'
    ? String(rawPrice)
    : undefined;

  if (
    typeof title !== 'string'
    || title.trim().length < 3
    || title.trim().length > 120
    || typeof description !== 'string'
    || description.trim().length < 10
    || description.trim().length > 5000
    || !Number.isFinite(Number(price))
    || Number(price) <= 0
    || !LISTING_CATEGORIES.includes(category)
    || !LISTING_CONDITIONS.includes(condition)
  ) {
    return undefined;
  }

  return { title, description, price, category, condition };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
