import test from 'node:test';
import assert from 'node:assert/strict';
import { Conversation } from '../src/models/Conversation.js';
import { CHAT_LISTING_FIELDS, CHAT_USER_FIELDS } from '../src/controllers/messageController.js';

test('conversation responses include the participant ban status', () => {
  assert.equal(CHAT_USER_FIELDS, 'username uid isBanned');
});

test('conversation responses include the listing sold status', () => {
  assert.equal(CHAT_LISTING_FIELDS, 'title price images soldAt');
});

test('conversation serializes populated buyer and seller details', () => {
  assert.equal(Conversation.schema.get('toJSON').virtuals, true);
  assert.equal(Conversation.schema.get('toObject').virtuals, true);
});

test('conversation user virtuals join Firebase UIDs to User.uid', () => {
  const buyerDetails = Conversation.schema.virtualpath('buyerDetails').options;
  const sellerDetails = Conversation.schema.virtualpath('sellerDetails').options;

  assert.deepEqual(
    {
      ref: buyerDetails.ref,
      localField: buyerDetails.localField,
      foreignField: buyerDetails.foreignField,
      justOne: buyerDetails.justOne,
    },
    { ref: 'User', localField: 'buyer', foreignField: 'uid', justOne: true },
  );
  assert.deepEqual(
    {
      ref: sellerDetails.ref,
      localField: sellerDetails.localField,
      foreignField: sellerDetails.foreignField,
      justOne: sellerDetails.justOne,
    },
    { ref: 'User', localField: 'seller', foreignField: 'uid', justOne: true },
  );
});

test('conversation uniqueness is scoped to buyer, seller, and listing', () => {
  const indexes = Conversation.schema.indexes();

  assert.ok(indexes.some(([fields, options]) => (
    fields.buyer === 1
    && fields.seller === 1
    && fields.listing === 1
    && Object.keys(fields).length === 3
    && options.unique === true
  )));
  assert.equal(indexes.some(([fields]) => 'participants' in fields), false);
});
