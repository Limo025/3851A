import assert from 'node:assert/strict';
import test from 'node:test';
import { LISTING_REPORT_REASONS, submitListingReport, submitUserReport } from '../src/utils/reports.js';

test('report helpers validate descriptions and send target-specific requests', async () => {
  const calls = [];
  const request = async (...args) => { calls.push(args); return { ok: true }; };
  await assert.rejects(() => submitUserReport({ conversationId: 'c1', reason: 'Spam', description: 'too short', request }), /10/);
  await submitUserReport({ conversationId: 'c1', reason: 'Spam', description: '  repeated spam messages  ', request });
  await submitListingReport({ listingId: 'l1', reason: 'AI-generated image', description: '  This image appears synthetic.  ', request });
  assert.deepEqual(calls[0], ['/api/reports/users', { method: 'POST', auth: true, body: { conversationId: 'c1', reason: 'Spam', description: 'repeated spam messages' } }]);
  assert.equal(calls[1][0], '/api/reports/listings/l1');
  assert.ok(LISTING_REPORT_REASONS.includes('AI-generated image'));
});

test('report helpers reject reasons that belong to another target', async () => {
  await assert.rejects(() => submitUserReport({ conversationId: 'c', reason: 'AI-generated image', description: 'This has enough detail.' }), /reason/);
});
