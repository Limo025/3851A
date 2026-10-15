import assert from 'node:assert/strict';
import test from 'node:test';
import { filterMyListings } from '../src/utils/myListings.js';

const listings = [
  { title: ' Desk Lamp ', soldAt: null, category: 'Electronics', condition: 'Good' },
  { title: 'Textbook', soldAt: '2026-01-01', category: 'Books and Textbooks', condition: 'Fair' },
  { title: null, soldAt: null, category: null, condition: null },
];

test('my listings combines normalized title, availability, category, and condition filters', () => {
  assert.deepEqual(filterMyListings(listings, { search: ' lamp ', availability: 'available', category: 'Electronics', condition: 'Good' }), [listings[0]]);
  assert.deepEqual(filterMyListings(listings, { search: '', availability: 'sold', category: '', condition: '' }), [listings[1]]);
});

test('my listings reset returns all without mutating input and no matches returns empty', () => {
  const copy = [...listings];
  assert.deepEqual(filterMyListings(listings, {}), listings);
  assert.deepEqual(listings, copy);
  assert.deepEqual(filterMyListings(listings, { search: 'missing' }), []);
});
