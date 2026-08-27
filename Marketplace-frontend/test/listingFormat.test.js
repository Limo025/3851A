import assert from 'node:assert/strict';
import test from 'node:test';
import { formatListingDate, formatListingPrice } from '../src/utils/listingFormat.js';

test('formatListingPrice formats positive numbers and non-empty numeric strings in AUD', () => {
  assert.equal(formatListingPrice(12.5), '$12.50');
  assert.equal(formatListingPrice(' 25 '), '$25.00');
});

test('formatListingPrice rejects missing, non-numeric, non-finite, and non-positive values', () => {
  [null, undefined, '', '   ', {}, NaN, Infinity, -Infinity, 0, -1, 'not a number'].forEach((value) => {
    assert.equal(formatListingPrice(value), 'Price unavailable');
  });
});

test('formatListingDate formats valid non-empty API date strings in en-AU', () => {
  assert.equal(formatListingDate('2026-08-28T00:00:00.000Z'), '28 August 2026');
});

test('formatListingDate rejects missing, non-string, blank, and invalid values', () => {
  [null, undefined, '', '   ', 0, {}, 'not a date'].forEach((value) => {
    assert.equal(formatListingDate(value), 'Date unavailable');
  });
});
