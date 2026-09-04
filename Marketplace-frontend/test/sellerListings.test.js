import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DELETE_LISTING_CONFIRMATION,
  buildEditListingFormData,
  getDeleteErrorMessage,
  prepareListingForEdit,
  requestListingDeletion,
} from '../src/utils/sellerListings.js';

function imageFile(name, { type = 'image/jpeg' } = {}) {
  return new File(['image data'], name, { type });
}

test('edit preparation retains complete existing images and populates the shared form', () => {
  assert.deepEqual(prepareListingForEdit({
    title: 'Study desk',
    description: 'Solid timber desk in good condition.',
    price: 75.5,
    category: 'Furniture and Home',
    condition: 'Good',
    images: [
      { url: 'https://images.test/desk.jpg', publicId: 'listing/desk' },
      { url: 'https://images.test/missing-id.jpg' },
    ],
  }), {
    initialValues: {
      title: 'Study desk',
      description: 'Solid timber desk in good condition.',
      price: '75.5',
      category: 'Furniture and Home',
      condition: 'Good',
    },
    retainedImages: [
      { url: 'https://images.test/desk.jpg', publicId: 'listing/desk' },
    ],
  });
});

test('edit multipart data sends retained public IDs and new images without client identity', () => {
  const newImage = imageFile('chair.webp', { type: 'image/webp' });
  const body = buildEditListingFormData({
    title: 'Desk and chair',
    description: 'A matching desk and chair for a study room.',
    price: '95.00',
    category: 'Furniture and Home',
    condition: 'Good',
    seller: 'attacker-controlled',
  }, [
    { url: 'https://images.test/desk.jpg', publicId: 'listing/desk' },
  ], [newImage]);

  assert.equal(body.get('title'), 'Desk and chair');
  assert.equal(body.get('retainedImagePublicIds'), JSON.stringify(['listing/desk']));
  assert.deepEqual(body.getAll('images').map((entry) => entry.name), ['chair.webp']);
  assert.equal(body.has('seller'), false);
  assert.equal(body.has('sellerId'), false);
});

test('delete cancellation does not call the seller API', async () => {
  let requests = 0;
  const deleted = await requestListingDeletion({
    listingId: 'listing-1',
    activeIds: new Set(),
    confirmDelete: (message) => {
      assert.equal(message, DELETE_LISTING_CONFIRMATION);
      return false;
    },
    request: async () => { requests += 1; },
  });

  assert.equal(deleted, false);
  assert.equal(requests, 0);
});

test('delete locking prevents a repeated request and releases after the request settles', async () => {
  const activeIds = new Set();
  const pendingStates = [];
  const calls = [];
  let releaseRequest;
  const request = (path, options) => {
    calls.push({ path, options });
    return new Promise((resolve) => { releaseRequest = resolve; });
  };

  const first = requestListingDeletion({
    listingId: 'listing/1',
    activeIds,
    confirmDelete: () => true,
    request,
    onPendingChange: (pending) => pendingStates.push(pending),
  });
  const repeated = await requestListingDeletion({
    listingId: 'listing/1',
    activeIds,
    confirmDelete: () => true,
    request,
  });

  assert.equal(repeated, false);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    path: '/api/listings/listing%2F1',
    options: { method: 'DELETE', auth: true, signal: undefined },
  });
  assert.deepEqual(pendingStates, [true]);

  releaseRequest();
  assert.equal(await first, true);
  assert.deepEqual(pendingStates, [true, false]);
  assert.equal(activeIds.size, 0);
});

test('failed deletion releases its lock for an accessible retry', async () => {
  const activeIds = new Set();

  await assert.rejects(requestListingDeletion({
    listingId: 'listing-1',
    activeIds,
    confirmDelete: () => true,
    request: async () => { throw new Error('Network unavailable'); },
  }), /Network unavailable/);

  assert.equal(activeIds.size, 0);
});

test('delete failures have clear ownership, missing, and network messages', () => {
  assert.equal(getDeleteErrorMessage({ status: 403 }), 'You do not own this listing');
  assert.equal(
    getDeleteErrorMessage({ status: 404 }),
    'This listing no longer exists. Refresh the page to update your listings.',
  );
  assert.equal(
    getDeleteErrorMessage(new TypeError('Failed to fetch')),
    'Unable to delete this listing. Check your connection and try again.',
  );
});
