import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssistantListingSearch } from '../src/services/assistantListingSearch.js';

test('summarize uses one aggregation and returns condition counts', async () => {
  const pipelines = [];
  const ListingModel = {
    aggregate: async (pipeline) => {
      pipelines.push(pipeline);
      return [{
        totals: [{ total: 3, minPrice: 400, maxPrice: 650 }],
        conditions: [{ _id: 'Good', count: 3 }],
      }];
    },
  };
  const search = createAssistantListingSearch({ ListingModel });

  assert.deepEqual(await search.summarize('PS5.*'), {
    total: 3,
    minPrice: 400,
    maxPrice: 650,
    byCondition: { New: 0, 'Like New': 0, Good: 3, Fair: 0 },
  });
  assert.equal(pipelines.length, 1);
  assert.match(pipelines[0][0].$match.$or[0].title.$regex.source, /PS5\\\.\\\*/);
});

test('final matches use an inclusion-only allowlist and limit to five', async () => {
  const calls = {};
  const ListingModel = {
    find: (filter, projection) => {
      calls.filter = filter;
      calls.projection = projection;
      return {
        sort(value) { calls.sort = value; return this; },
        limit(value) { calls.limit = value; return this; },
        lean: async () => [{
          _id: 'a',
          title: 'PS5',
          price: 450,
          category: 'Electronics',
          condition: 'Good',
          images: [{ url: 'https://img/a' }],
          seller: { email: 'private@example.test' },
          description: 'A private description',
        }],
      };
    },
  };

  const results = await createAssistantListingSearch({ ListingModel }).findMatches({
    query: 'PS5',
    maxPrice: 500,
    conditions: ['Good'],
    limit: 50,
  });

  assert.equal(calls.limit, 5);
  assert.deepEqual(calls.projection, {
    title: 1,
    price: 1,
    category: 1,
    condition: 1,
    'images.url': 1,
  });
  assert.deepEqual(results[0], {
    id: 'a',
    title: 'PS5',
    price: 450,
    category: 'Electronics',
    condition: 'Good',
    imageUrl: 'https://img/a',
  });
});

test('final matches normalizes invalid limits to the safe maximum', async () => {
  const requestedLimits = [0, -1, 'three', 3.5, 50];
  const appliedLimits = [];
  const ListingModel = {
    find: () => ({
      sort() { return this; },
      limit(value) { appliedLimits.push(value); return this; },
      lean: async () => [],
    }),
  };
  const search = createAssistantListingSearch({ ListingModel });

  for (const limit of requestedLimits) {
    await search.findMatches({
      query: 'PS5',
      maxPrice: 500,
      conditions: ['Good'],
      limit,
    });
  }

  assert.deepEqual(appliedLimits, [5, 5, 5, 5, 5]);
});

test('summarize ignores unknown condition buckets and returns zeroes for no matches', async () => {
  const ListingModel = {
    aggregate: async () => [{
      totals: [],
      conditions: [{ _id: 'Broken', count: 7 }],
    }],
  };

  const summary = await createAssistantListingSearch({ ListingModel }).summarize('desk');

  assert.deepEqual(summary, {
    total: 0,
    minPrice: null,
    maxPrice: null,
    byCondition: { New: 0, 'Like New': 0, Good: 0, Fair: 0 },
  });
});
