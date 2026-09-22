import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AssistantDraftError,
  validateAssistantDraft,
} from '../src/services/listingDraft.js';

test('accepts a complete draft and ignores model-supplied identity', () => {
  assert.deepEqual(validateAssistantDraft({
    facts: { price: 450, category: 'Electronics', condition: 'Good' },
    copy: {
      title: 'PlayStation 5 Console',
      description: 'PlayStation 5 console in good working condition.',
      seller: 'forged',
    },
  }), {
    title: 'PlayStation 5 Console',
    description: 'PlayStation 5 console in good working condition.',
    price: 450,
    category: 'Electronics',
    condition: 'Good',
  });
});

test('rejects invalid generated copy through the shared listing rules', () => {
  assert.throws(
    () => validateAssistantDraft({
      facts: { price: 0, category: 'Unknown', condition: 'Broken' },
      copy: { title: 'x', description: 'too short' },
    }),
    (error) => {
      assert.ok(error instanceof AssistantDraftError);
      assert.deepEqual(error.errors, [
        'Title must be between 3 and 120 characters',
        'Description must be between 10 and 5000 characters',
        'Price must be greater than 0',
        'Category is invalid',
        'Condition is invalid',
      ]);
      return true;
    },
  );
});
