import assert from 'node:assert/strict';
import test from 'node:test';
import { clampPage } from '../src/utils/pagination.js';

test('clampPage caps an out-of-range page at the final server page', () => {
  assert.equal(clampPage(999, 5), 5);
});

test('clampPage returns the first page for an invalid requested page', () => {
  assert.equal(clampPage(0, 5), 1);
});

test('clampPage returns page one when the server reports no pages', () => {
  assert.equal(clampPage(3, 0), 1);
});
