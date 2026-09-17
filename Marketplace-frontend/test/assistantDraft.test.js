import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { listingDraftFromLocationState } from '../src/assistant/listingDraft.js';

test('accepts only the five listing form fields', () => {
  assert.deepEqual(listingDraftFromLocationState({
    assistantDraft: {
      title: 'PS5 console',
      description: 'PS5 console in good working condition.',
      price: 450,
      category: 'Electronics',
      condition: 'Good',
      seller: 'forged',
    },
  }), {
    title: 'PS5 console',
    description: 'PS5 console in good working condition.',
    price: '450',
    category: 'Electronics',
    condition: 'Good',
  });
});

test('returns undefined for invalid or absent router state', () => {
  assert.equal(listingDraftFromLocationState(null), undefined);
  assert.equal(listingDraftFromLocationState({ assistantDraft: { title: 'x' } }), undefined);
  assert.equal(listingDraftFromLocationState({
    assistantDraft: {
      title: 'PS5 console',
      description: 'PS5 console in good working condition.',
      price: 0,
      category: 'Electronics',
      condition: 'Good',
    },
  }), undefined);
});

test('create listing remounts with each router location while passing normalized draft values', async () => {
  const source = await readFile(new URL('../src/pages/CreateListing.jsx', import.meta.url), 'utf8');

  assert.match(
    source,
    /<ListingForm\s+key=\{location\.key\}\s+initialValues=\{initialValues\}\s+submitLabel="Create listing"\s+onSubmit=\{createListing\}\s*\/>/,
  );
});
