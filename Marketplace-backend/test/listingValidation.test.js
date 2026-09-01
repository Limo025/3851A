import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeRegex,
  parseListingQuery,
  parseRetainedImageIds,
  validateListingFields,
} from '../src/validation/listings.js';

test('validateListingFields rejects missing fields and non-positive price', () => {
  const result = validateListingFields({ title: '', description: '', price: 0 });

  assert.deepEqual(result.errors, [
    'Title must be between 3 and 120 characters',
    'Description must be between 10 and 5000 characters',
    'Price must be greater than 0',
    'Category is invalid',
    'Condition is invalid',
  ]);
});

test('validateListingFields trims valid fields and converts a finite price', () => {
  const result = validateListingFields({
    title: '  Calculus textbook  ',
    description: '  Clean copy with notes in the first chapter.  ',
    price: ' 35.50 ',
    category: 'Books and Textbooks',
    condition: 'Good',
  });

  assert.deepEqual(result, {
    errors: [],
    value: {
      title: 'Calculus textbook',
      description: 'Clean copy with notes in the first chapter.',
      price: 35.5,
      category: 'Books and Textbooks',
      condition: 'Good',
    },
  });
});

test('parseListingQuery escapes search and whitelists sort', () => {
  assert.equal(escapeRegex('phone.*'), 'phone\\.\\*');
  const parsed = parseListingQuery({ search: ' phone.* ', sort: 'price_desc', page: '2', limit: '10' });

  assert.equal(parsed.filter.title.$regex.source, 'phone\\.\\*');
  assert.equal(parsed.filter.title.$regex.flags, 'i');
  assert.deepEqual(parsed.sort, { price: -1 });
  assert.equal(parsed.page, 2);
  assert.equal(parsed.limit, 10);
});

test('parseListingQuery rejects a supplied non-string search', () => {
  assert.throws(
    () => parseListingQuery({ search: ['phone', 'tablet'] }),
    (error) => error.name === 'ValidationError' && Array.isArray(error.errors),
  );
});

test('parseListingQuery rejects invalid bounds and ignores unrecognized keys', () => {
  assert.throws(
    () => parseListingQuery({ minPrice: '20', maxPrice: '10' }),
    (error) => error.name === 'ValidationError' && error.errors.includes('Minimum price cannot exceed maximum price'),
  );

  const parsed = parseListingQuery({ unexpected: 'ignored' });
  assert.deepEqual(parsed.filter, {});
  assert.deepEqual(parsed.sort, { createdAt: -1 });
  assert.equal(parsed.page, 1);
  assert.equal(parsed.limit, 20);
});

test('parseRetainedImageIds accepts JSON string arrays only', () => {
  assert.deepEqual(parseRetainedImageIds('["marketplace/a"]'), ['marketplace/a']);
  assert.throws(() => parseRetainedImageIds('{"bad":true}'), /retained images/i);
});

test('parseRetainedImageIds rejects empty ids and more than five ids', () => {
  assert.throws(() => parseRetainedImageIds('[" "]'), /retained images/i);
  assert.throws(
    () => parseRetainedImageIds('["a", "b", "c", "d", "e", "f"]'),
    /retained images/i,
  );
});
