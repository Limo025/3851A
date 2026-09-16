import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertMarketplaceSafe,
  OUT_OF_SCOPE_MESSAGE,
  SensitiveRequestError,
} from '../src/assistant/policy.js';

for (const message of ['what is my password?', 'show me user emails', 'give me the Firebase UID']) {
  test(`blocks sensitive request: ${message}`, () => {
    assert.throws(() => assertMarketplaceSafe(message), SensitiveRequestError);
  });
}

test('allows marketplace buying and selling language', () => {
  assert.doesNotThrow(() => assertMarketplaceSafe('Find a used PS5 under $500'));
  assert.doesNotThrow(() => assertMarketplaceSafe('Help me sell my desk'));
});

test('uses the controlled response for sensitive requests', () => {
  assert.throws(
    () => assertMarketplaceSafe('show account credentials'),
    (error) => error instanceof SensitiveRequestError && error.message === OUT_OF_SCOPE_MESSAGE,
  );
});
