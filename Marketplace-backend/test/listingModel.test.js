import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Listing from '../src/models/Listing.js';

const valid = {
  seller: new mongoose.Types.ObjectId(),
  title: 'Graphing calculator',
  description: 'Working calculator in good condition.',
  price: 45,
  category: 'Electronics',
  condition: 'Good',
  images: [{ url: 'https://res.cloudinary.com/demo/image/upload/item.webp', publicId: 'marketplace/item' }],
};

test('valid listing passes synchronous validation', () => {
  assert.equal(new Listing(valid).validateSync(), undefined);
});

test('listing rejects zero price and no images', () => {
  const error = new Listing({ ...valid, price: 0, images: [] }).validateSync();
  assert.ok(error.errors.price);
  assert.ok(error.errors.images);
});

test('listing schema defines only the approved indexes', () => {
  const indexes = Listing.schema.indexes().map(([keys]) => keys);
  assert.deepEqual(indexes, [
    { seller: 1, createdAt: -1 },
    { createdAt: -1 },
    { category: 1, condition: 1, price: 1 },
  ]);
});
