import {
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
  MAX_LISTING_IMAGES,
} from '../constants/listings.js';

const SORT_OPTIONS = Object.freeze({
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
});

const trimString = (value) => (typeof value === 'string' ? value.trim() : '');

export class ValidationError extends Error {
  constructor(errors) {
    super(errors.join('; '));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export function validateListingFields(input = {}) {
  const value = {
    title: trimString(input.title),
    description: trimString(input.description),
    price: Number(input.price),
    category: trimString(input.category),
    condition: trimString(input.condition),
  };
  const errors = [];

  if (value.title.length < 3 || value.title.length > 120) {
    errors.push('Title must be between 3 and 120 characters');
  }
  if (value.description.length < 10 || value.description.length > 5000) {
    errors.push('Description must be between 10 and 5000 characters');
  }
  if (!Number.isFinite(value.price) || value.price <= 0) {
    errors.push('Price must be greater than 0');
  }
  if (!LISTING_CATEGORIES.includes(value.category)) {
    errors.push('Category is invalid');
  }
  if (!LISTING_CONDITIONS.includes(value.condition)) {
    errors.push('Condition is invalid');
  }

  return { value, errors };
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseFiniteNonNegative(value, name, errors) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    errors.push(`${name} must be a finite non-negative number`);
    return undefined;
  }
  return number;
}

function parsePositiveInteger(value, name, errors, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0 || (maximum !== undefined && number > maximum)) {
    errors.push(
      maximum === undefined
        ? `${name} must be a positive integer`
        : `${name} must be a positive integer no greater than ${maximum}`,
    );
    return undefined;
  }
  return number;
}

export function parseListingQuery(query = {}) {
  const errors = [];
  const filter = {};
  let minPrice;
  let maxPrice;

  if (query.search !== undefined) {
    if (typeof query.search !== 'string') {
      errors.push('Search must be a string');
    } else if (query.search.trim().length > 100) {
      errors.push('Search must be at most 100 characters');
    } else if (query.search.trim()) {
      filter.title = { $regex: new RegExp(escapeRegex(query.search.trim()), 'i') };
    }
  }
  if (query.category !== undefined) {
    const category = trimString(query.category);
    if (!LISTING_CATEGORIES.includes(category)) errors.push('Category is invalid');
    else filter.category = category;
  }
  if (query.condition !== undefined) {
    const condition = trimString(query.condition);
    if (!LISTING_CONDITIONS.includes(condition)) errors.push('Condition is invalid');
    else filter.condition = condition;
  }
  if (query.minPrice !== undefined) {
    minPrice = parseFiniteNonNegative(query.minPrice, 'Minimum price', errors);
  }
  if (query.maxPrice !== undefined) {
    maxPrice = parseFiniteNonNegative(query.maxPrice, 'Maximum price', errors);
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    errors.push('Minimum price cannot exceed maximum price');
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  const sortKey = query.sort === undefined ? 'newest' : trimString(query.sort);
  if (!Object.hasOwn(SORT_OPTIONS, sortKey)) errors.push('Sort is invalid');

  const page = query.page === undefined ? 1 : parsePositiveInteger(query.page, 'Page', errors);
  const limit = query.limit === undefined ? 20 : parsePositiveInteger(query.limit, 'Limit', errors, 50);

  if (errors.length) throw new ValidationError(errors);

  return { filter, sort: SORT_OPTIONS[sortKey], page, limit };
}

export function parseRetainedImageIds(raw) {
  if (raw === undefined || raw === null || raw === '') return [];

  let retainedImagePublicIds;
  try {
    retainedImagePublicIds = JSON.parse(raw);
  } catch {
    throw new ValidationError(['Retained images must be a JSON array of non-empty strings']);
  }

  if (
    !Array.isArray(retainedImagePublicIds)
    || retainedImagePublicIds.length > MAX_LISTING_IMAGES
    || retainedImagePublicIds.some((id) => typeof id !== 'string' || !id.trim())
  ) {
    throw new ValidationError(['Retained images must be a JSON array of up to five non-empty strings']);
  }

  return retainedImagePublicIds.map((id) => id.trim());
}
