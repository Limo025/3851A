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

test('listing requires a seller and references User', () => {
  const missingSeller = new Listing({ ...valid, seller: undefined }).validateSync();
  assert.ok(missingSeller.errors.seller);
  assert.equal(Listing.schema.path('seller').options.ref, 'User');
});

test('listing enforces trimmed title bounds', () => {
  const tooShort = new Listing({ ...valid, title: ' ab ' }).validateSync();
  const tooLong = new Listing({ ...valid, title: ` ${'a'.repeat(121)} ` }).validateSync();
  assert.ok(tooShort.errors.title);
  assert.ok(tooLong.errors.title);
});

test('listing enforces trimmed description bounds', () => {
  const tooShort = new Listing({ ...valid, description: ' 123456789 ' }).validateSync();
  const tooLong = new Listing({ ...valid, description: ` ${'a'.repeat(5001)} ` }).validateSync();
  assert.ok(tooShort.errors.description);
  assert.ok(tooLong.errors.description);
});

test('listing rejects non-finite prices', () => {
  const nanError = new Listing({ ...valid, price: Number.NaN }).validateSync();
  const infinityError = new Listing({ ...valid, price: Number.POSITIVE_INFINITY }).validateSync();
  assert.ok(nanError.errors.price);
  assert.ok(infinityError.errors.price);
});

test('listing rejects categories and conditions outside their enums', () => {
  const categoryError = new Listing({ ...valid, category: 'Vehicles' }).validateSync();
  const conditionError = new Listing({ ...valid, condition: 'Broken' }).validateSync();
  assert.ok(categoryError.errors.category);
  assert.ok(conditionError.errors.condition);
});

test('listing rejects more than five images', () => {
  const images = Array.from({ length: 6 }, (_, index) => ({
    url: `https://res.cloudinary.com/demo/image/upload/item-${index}.webp`,
    publicId: `marketplace/item-${index}`,
  }));
  const error = new Listing({ ...valid, images }).validateSync();
  assert.ok(error.errors.images);
});

test('listing requires HTTPS image URLs and public ids', () => {
  const httpError = new Listing({
    ...valid,
    images: [{ ...valid.images[0], url: 'http://res.cloudinary.com/demo/item.webp' }],
  }).validateSync();
  const missingPublicIdError = new Listing({
    ...valid,
    images: [{ url: valid.images[0].url }],
  }).validateSync();
  assert.ok(httpError.errors['images.0.url']);
  assert.ok(missingPublicIdError.errors['images.0.publicId']);
});

test('listing trims image public ids', () => {
  const listing = new Listing({
    ...valid,
    images: [{ ...valid.images[0], publicId: '  marketplace/item  ' }],
  });
  assert.equal(listing.validateSync(), undefined);
  assert.equal(listing.images[0].publicId, 'marketplace/item');
});

test('listing schema defines only the approved indexes', () => {
  const indexes = Listing.schema.indexes().map(([keys]) => keys);
  assert.deepEqual(indexes, [
    { seller: 1, createdAt: -1 },
    { createdAt: -1 },
    { category: 1, condition: 1, price: 1 },
  ]);
});
