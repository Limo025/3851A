import test from 'node:test';
import assert from 'node:assert/strict';
import { getOtherParticipant, isConversationListingSold, isOtherParticipantBanned } from '../src/utils/chatParticipants.js';

const conversation = {
  buyerDetails: { username: 'Buyer', isBanned: false },
  sellerDetails: { username: 'Seller', isBanned: true },
};

test('chat identifies the other participant and their ban state for each mode', () => {
  assert.equal(getOtherParticipant(conversation, 'buyer').username, 'Seller');
  assert.equal(isOtherParticipantBanned(conversation, 'buyer'), true);
  assert.equal(getOtherParticipant(conversation, 'seller').username, 'Buyer');
  assert.equal(isOtherParticipantBanned(conversation, 'seller'), false);
});

test('chat identifies sold and available conversation listings', () => {
  assert.equal(isConversationListingSold({ listing: { soldAt: '2026-09-24T00:00:00.000Z' } }), true);
  assert.equal(isConversationListingSold({ listing: { soldAt: null } }), false);
  assert.equal(isConversationListingSold({ listing: null }), false);
});
