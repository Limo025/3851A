import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { createListingRouter } from '../src/routes/listings.js';

const validFields = {
  title: 'Calculus textbook',
  description: 'Clean copy with notes in the first chapter.',
  price: '35.50',
  category: 'Books and Textbooks',
  condition: 'Good',
};
const uploadedImages = [{ url: 'https://cdn.test/a.webp', publicId: 'marketplace/a' }];

function fakeAuth(req, _res, next) {
  req.user = { uid: 'firebase-a' };
  next();
}

function uploadWith(body = validFields, files = [{ originalname: 'a.webp' }]) {
  return (req, _res, next) => {
    req.body = body;
    req.files = files;
    next();
  };
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

function listingModel({ create = async (payload) => ({ ...payload, populate: async () => payload }) } = {}) {
  return { create };
}

function userModel(user = { _id: 'mongo-a' }) {
  return { findOne: async () => user };
}

test('POST / creates a listing for the authenticated MongoDB seller', async () => {
  let createdPayload;
  const ListingModel = listingModel({
    create: async (payload) => {
      createdPayload = payload;
      return { ...payload, populate: async () => ({ ...payload, seller: { _id: 'mongo-a', username: 'Ada' } }) };
    },
  });
  const imageStore = { uploadImages: async () => uploadedImages, deleteImages: async () => {} };

  await withListingApp({
    ListingModel,
    UserModel: userModel(),
    authenticate: fakeAuth,
    uploadMiddleware: uploadWith({ ...validFields, sellerId: 'someone-else' }),
    imageStore,
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings`, { method: 'POST' });

    assert.equal(response.status, 201);
    assert.deepEqual((await response.json()).images, uploadedImages);
  });

  assert.equal(createdPayload.seller, 'mongo-a');
  assert.equal(createdPayload.sellerId, undefined);
  assert.deepEqual(createdPayload.images, [{ url: 'https://cdn.test/a.webp', publicId: 'marketplace/a' }]);
});

test('POST / returns 401 when authentication middleware rejects the request', async () => {
  const authenticate = (_req, res) => res.status(401).json({ error: 'Missing authorization' });

  await withListingApp({
    ListingModel: listingModel(),
    UserModel: userModel(),
    authenticate,
    uploadMiddleware: uploadWith(),
    imageStore: { uploadImages: async () => uploadedImages, deleteImages: async () => {} },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings`, { method: 'POST' });

    assert.equal(response.status, 401);
  });
});

test('POST / returns 401 when the Firebase user has no MongoDB user', async () => {
  let uploaded = false;

  await withListingApp({
    ListingModel: listingModel(),
    UserModel: userModel(null),
    authenticate: fakeAuth,
    uploadMiddleware: uploadWith(),
    imageStore: {
      uploadImages: async () => { uploaded = true; return uploadedImages; },
      deleteImages: async () => {},
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings`, { method: 'POST' });

    assert.equal(response.status, 401);
  });

  assert.equal(uploaded, false);
});

test('POST / validates missing title before uploading images', async () => {
  let uploaded = false;

  await withListingApp({
    ListingModel: listingModel(),
    UserModel: userModel(),
    authenticate: fakeAuth,
    uploadMiddleware: uploadWith({ ...validFields, title: '' }),
    imageStore: {
      uploadImages: async () => { uploaded = true; return uploadedImages; },
      deleteImages: async () => {},
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings`, { method: 'POST' });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /title/i);
  });

  assert.equal(uploaded, false);
});

test('POST / rejects a listing without an image before storing anything', async () => {
  let uploaded = false;

  await withListingApp({
    ListingModel: listingModel(),
    UserModel: userModel(),
    authenticate: fakeAuth,
    uploadMiddleware: uploadWith(validFields, []),
    imageStore: {
      uploadImages: async () => { uploaded = true; return uploadedImages; },
      deleteImages: async () => {},
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings`, { method: 'POST' });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /image/i);
  });

  assert.equal(uploaded, false);
});

test('POST / removes uploaded images when listing creation fails', async () => {
  let deletedPublicIds;

  await withListingApp({
    ListingModel: listingModel({ create: async () => { throw new Error('database unavailable'); } }),
    UserModel: userModel(),
    authenticate: fakeAuth,
    uploadMiddleware: uploadWith(),
    imageStore: {
      uploadImages: async () => uploadedImages,
      deleteImages: async (publicIds) => { deletedPublicIds = publicIds; },
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings`, { method: 'POST' });

    assert.equal(response.status, 500);
    assert.equal((await response.json()).error, 'Failed to create listing');
  });

  assert.deepEqual(deletedPublicIds, ['marketplace/a']);
});
