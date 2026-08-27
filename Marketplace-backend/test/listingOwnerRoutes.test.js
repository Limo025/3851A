import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { createListingRouter } from '../src/routes/listings.js';

const listingId = '507f1f77bcf86cd799439011';
const missingListingId = '507f1f77bcf86cd799439012';
const mongoA = '507f191e810c19729de860ea';
const mongoB = '507f191e810c19729de860eb';
const validFields = {
  title: 'Calculus textbook',
  description: 'Clean copy with notes in the first chapter.',
  price: '35.50',
  category: 'Books and Textbooks',
  condition: 'Good',
};

function fakeAuth(req, _res, next) {
  req.user = { uid: req.headers['x-firebase-uid'] || 'firebase-a' };
  next();
}

function uploadWith(body = validFields, files = []) {
  return (req, _res, next) => {
    req.body = body;
    req.files = files;
    next();
  };
}

function userModel() {
  const users = {
    'firebase-a': { _id: mongoA },
    'firebase-b': { _id: mongoB },
  };
  return { findOne: async ({ uid }) => users[uid] ?? null };
}

function makeListing({
  seller = mongoA,
  images = [
    { url: 'https://cdn.test/a.webp', publicId: 'marketplace/a' },
    { url: 'https://cdn.test/b.webp', publicId: 'marketplace/b' },
  ],
  save = async () => {},
  deleteOne = async () => {},
} = {}) {
  return { _id: listingId, seller, ...validFields, images, save, deleteOne };
}

async function withListingApp(dependencies, run) {
  const app = express().use('/api/listings', createListingRouter(dependencies));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function baseDependencies({ ListingModel, uploadMiddleware = uploadWith(), imageStore } = {}) {
  return {
    ListingModel,
    UserModel: userModel(),
    authenticate: fakeAuth,
    uploadMiddleware,
    imageStore: imageStore || { uploadImages: async () => [], deleteImages: async () => {} },
  };
}

test('GET /mine filters listings by the authenticated MongoDB seller', async () => {
  let filter;
  const listings = [{ _id: listingId, seller: mongoA, title: 'Calculus textbook' }];
  const ListingModel = {
    find(value) {
      filter = value;
      return {
        populate() { return this; },
        sort() { return this; },
        lean: async () => listings,
      };
    },
  };

  await withListingApp(baseDependencies({ ListingModel }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings/mine`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), listings);
  });

  assert.deepEqual(filter, { seller: mongoA });
});

test('PUT and DELETE reject another seller before storage or database mutations', async () => {
  let uploadCalled = false;
  let saveCalled = false;
  let deleteCalled = false;
  const listing = makeListing({
    save: async () => { saveCalled = true; },
    deleteOne: async () => { deleteCalled = true; },
  });
  const ListingModel = { findById: async () => listing };
  const imageStore = {
    uploadImages: async () => { uploadCalled = true; return []; },
    deleteImages: async () => { uploadCalled = true; },
  };

  await withListingApp(baseDependencies({
    ListingModel,
    uploadMiddleware: uploadWith({ title: 'Tampered title' }, [{ originalname: 'new.webp' }]),
    imageStore,
  }), async (baseUrl) => {
    const headers = { 'x-firebase-uid': 'firebase-b' };
    const update = await fetch(`${baseUrl}/api/listings/${listingId}`, { method: 'PUT', headers });
    const remove = await fetch(`${baseUrl}/api/listings/${listingId}`, { method: 'DELETE', headers });

    assert.equal(update.status, 403);
    assert.equal(remove.status, 403);
  });

  assert.equal(saveCalled, false);
  assert.equal(deleteCalled, false);
  assert.equal(uploadCalled, false);
});

test('PUT distinguishes malformed and missing listing ids before mutation', async () => {
  let lookedUp = false;
  const ListingModel = {
    findById(id) {
      lookedUp = true;
      assert.equal(id, missingListingId);
      return null;
    },
  };

  await withListingApp(baseDependencies({ ListingModel }), async (baseUrl) => {
    const malformed = await fetch(`${baseUrl}/api/listings/not-an-id`, { method: 'PUT' });
    assert.equal(malformed.status, 400);
    assert.match((await malformed.json()).error, /id/i);
    assert.equal(lookedUp, false);

    const missing = await fetch(`${baseUrl}/api/listings/${missingListingId}`, { method: 'PUT' });
    assert.equal(missing.status, 404);
    assert.match((await missing.json()).error, /not found/i);
  });
});

test('PUT retains approved images, persists a new image, and cleans removed assets', async () => {
  let savedImages;
  let deletedPublicIds;
  const listing = makeListing({
    images: [
      { url: 'https://cdn.test/a.webp', publicId: 'marketplace/a' },
      { url: 'https://cdn.test/b.webp', publicId: 'marketplace/b' },
      { url: 'https://cdn.test/c.webp', publicId: 'marketplace/c' },
    ],
    save: async function save() { savedImages = this.images; },
  });
  const ListingModel = { findById: async () => listing };
  const imageStore = {
    uploadImages: async () => [{ url: 'https://cdn.test/new.webp', publicId: 'marketplace/new' }],
    deleteImages: async (publicIds) => { deletedPublicIds = publicIds; },
  };

  await withListingApp(baseDependencies({
    ListingModel,
    uploadMiddleware: uploadWith(
      { ...validFields, retainedImagePublicIds: '["marketplace/a", "marketplace/b"]' },
      [{ originalname: 'new.webp' }],
    ),
    imageStore,
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings/${listingId}`, { method: 'PUT' });
    assert.equal(response.status, 200);
  });

  assert.deepEqual(savedImages, [
    { url: 'https://cdn.test/a.webp', publicId: 'marketplace/a' },
    { url: 'https://cdn.test/b.webp', publicId: 'marketplace/b' },
    { url: 'https://cdn.test/new.webp', publicId: 'marketplace/new' },
  ]);
  assert.deepEqual(deletedPublicIds, ['marketplace/c']);
});

test('PUT rejects retained images that are not on the listing and an empty result', async () => {
  let uploaded = false;
  let saved = false;
  const listing = makeListing({ save: async () => { saved = true; } });
  const ListingModel = { findById: async () => listing };
  const imageStore = {
    uploadImages: async () => { uploaded = true; return []; },
    deleteImages: async () => {},
  };

  await withListingApp(baseDependencies({
    ListingModel,
    uploadMiddleware: uploadWith({ ...validFields, retainedImagePublicIds: '["marketplace/not-owned"]' }),
    imageStore,
  }), async (baseUrl) => {
    const foreignRetained = await fetch(`${baseUrl}/api/listings/${listingId}`, { method: 'PUT' });
    assert.equal(foreignRetained.status, 400);
    assert.match((await foreignRetained.json()).error, /retained/i);
  });

  await withListingApp(baseDependencies({
    ListingModel,
    uploadMiddleware: uploadWith({ ...validFields, retainedImagePublicIds: '[]' }),
    imageStore,
  }), async (baseUrl) => {
    const emptyImages = await fetch(`${baseUrl}/api/listings/${listingId}`, { method: 'PUT' });
    assert.equal(emptyImages.status, 400);
    assert.match((await emptyImages.json()).error, /image/i);
  });

  assert.equal(uploaded, false);
  assert.equal(saved, false);
});

test('PUT removes only new assets when saving the updated listing fails', async () => {
  let deletedPublicIds;
  const listing = makeListing({ save: async () => { throw new Error('database unavailable'); } });
  const ListingModel = { findById: async () => listing };
  const imageStore = {
    uploadImages: async () => [{ url: 'https://cdn.test/new.webp', publicId: 'marketplace/new' }],
    deleteImages: async (publicIds) => { deletedPublicIds = publicIds; },
  };

  await withListingApp(baseDependencies({
    ListingModel,
    uploadMiddleware: uploadWith(
      { ...validFields, retainedImagePublicIds: '["marketplace/a", "marketplace/b"]' },
      [{ originalname: 'new.webp' }],
    ),
    imageStore,
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings/${listingId}`, { method: 'PUT' });
    assert.equal(response.status, 500);
  });

  assert.deepEqual(deletedPublicIds, ['marketplace/new']);
});

test('DELETE removes the database record before best-effort image cleanup', async () => {
  const events = [];
  const listing = makeListing({ deleteOne: async () => { events.push('database'); } });
  const ListingModel = { findById: async () => listing };
  const imageStore = {
    uploadImages: async () => [],
    deleteImages: async (publicIds) => { events.push(['storage', publicIds]); },
  };

  await withListingApp(baseDependencies({ ListingModel, imageStore }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings/${listingId}`, { method: 'DELETE' });
    assert.equal(response.status, 204);
  });

  assert.deepEqual(events, [
    'database',
    ['storage', ['marketplace/a', 'marketplace/b']],
  ]);
});
