import test from 'node:test';
import assert from 'node:assert/strict';
import { Conversation } from '../src/models/Conversation.js';

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
