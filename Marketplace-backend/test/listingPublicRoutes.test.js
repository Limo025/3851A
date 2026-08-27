import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { createListingRouter } from '../src/routes/listings.js';

async function withListingApp(ListingModel, run) {
  const app = express().use('/api/listings', createListingRouter({ ListingModel }));
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

function listQuery(value, calls) {
  return {
    populate(path, fields) {
      calls.populate = [path, fields];
      return this;
    },
    sort(sort) {
      calls.sort = sort;
      return this;
    },
    skip(skip) {
      calls.skip = skip;
      return this;
    },
    limit(limit) {
      calls.limit = limit;
      return this;
    },
    lean: async () => value,
  };
}

function detailQuery(value, calls) {
  return {
    populate(path, fields) {
      calls.populate = [path, fields];
      return this;
    },
    lean: async () => value,
  };
}

test('GET / returns a filtered, paginated listing response with safe sellers', async () => {
  const calls = {};
  const listings = [{ _id: 'listing-1', title: 'Laptop', seller: { _id: 'seller-1', username: 'Ada' } }];
  const ListingModel = {
    find(filter) {
      calls.findFilter = filter;
      return listQuery(listings, calls);
    },
    async countDocuments(filter) {
      calls.countFilter = filter;
      return 7;
    },
  };

  await withListingApp(ListingModel, async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/listings?search=%20phone.*%20&category=Electronics&condition=Good&minPrice=10&maxPrice=500&sort=price_desc&page=2&limit=3`,
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { listings, page: 2, pages: 3, total: 7 });
  });

  const expectedFilter = {
    title: { $regex: /phone\.\*/i },
    category: 'Electronics',
    condition: 'Good',
    price: { $gte: 10, $lte: 500 },
  };
  assert.deepEqual(calls.findFilter, expectedFilter);
  assert.deepEqual(calls.countFilter, expectedFilter);
  assert.deepEqual(calls.populate, ['seller', '_id username']);
  assert.deepEqual(calls.sort, { price: -1 });
  assert.equal(calls.skip, 3);
  assert.equal(calls.limit, 3);
});

test('GET / reports one page when no listings match', async () => {
  const calls = {};
  const ListingModel = {
    find: () => listQuery([], calls),
    countDocuments: async () => 0,
  };

  await withListingApp(ListingModel, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { listings: [], page: 1, pages: 1, total: 0 });
  });

  assert.deepEqual(calls.populate, ['seller', '_id username']);
  assert.deepEqual(calls.sort, { createdAt: -1 });
  assert.equal(calls.skip, 0);
  assert.equal(calls.limit, 20);
});

test('GET / returns 400 for a recognized invalid query without querying listings', async () => {
  let queried = false;
  const ListingModel = {
    find() {
      queried = true;
      throw new Error('invalid queries must not reach the database');
    },
    countDocuments() {
      queried = true;
      throw new Error('invalid queries must not reach the database');
    },
  };

  await withListingApp(ListingModel, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings?limit=51`);

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /limit/i);
  });

  assert.equal(queried, false);
});

test('GET /:id returns one populated listing with safe seller fields', async () => {
  const calls = {};
  const listingId = '507f1f77bcf86cd799439011';
  const listing = { _id: listingId, title: 'Desk lamp', seller: { _id: 'seller-1', username: 'Ada' } };
  const ListingModel = {
    findById(id) {
      calls.id = id;
      return detailQuery(listing, calls);
    },
  };

  await withListingApp(ListingModel, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings/${listingId}`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), listing);
  });

  assert.equal(calls.id, listingId);
  assert.deepEqual(calls.populate, ['seller', '_id username']);
});

test('GET /:id returns 404 when a valid listing id is absent', async () => {
  const listingId = '507f1f77bcf86cd799439011';
  const ListingModel = {
    findById: () => detailQuery(null, {}),
  };

  await withListingApp(ListingModel, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings/${listingId}`);

    assert.equal(response.status, 404);
    assert.match((await response.json()).error, /not found/i);
  });
});

test('GET /:id rejects malformed ObjectIds before querying listings', async () => {
  let queried = false;
  const ListingModel = {
    findById() {
      queried = true;
      throw new Error('malformed ids must not reach the database');
    },
  };

  await withListingApp(ListingModel, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/listings/not-an-id`);

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /id/i);
  });

  assert.equal(queried, false);
});
