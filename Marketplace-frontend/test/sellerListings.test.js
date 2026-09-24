import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEditListingFormData,
  getAvailabilityErrorMessage,
  prepareListingForEdit,
  requestListingAvailabilityUpdate,
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

test('availability update sends sold state and prevents repeated requests', async () => {
  const activeIds = new Set();
  const pendingStates = [];
  const calls = [];
  let releaseRequest;
  const request = (path, options) => {
    calls.push({ path, options });
    return new Promise((resolve) => { releaseRequest = resolve; });
  };

  const first = requestListingAvailabilityUpdate({
    listingId: 'listing/1',
    sold: true,
    activeIds,
    request,
    onPendingChange: (pending) => pendingStates.push(pending),
  });
  const repeated = await requestListingAvailabilityUpdate({
    listingId: 'listing/1',
    sold: true,
    activeIds,
    request,
  });

  assert.equal(repeated, null);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    path: '/api/listings/listing%2F1/sold',
    options: { method: 'PATCH', auth: true, body: { sold: true }, signal: undefined },
  });
  assert.deepEqual(pendingStates, [true]);

  releaseRequest({ _id: 'listing/1', soldAt: '2026-09-24T00:00:00.000Z' });
  assert.deepEqual(await first, { _id: 'listing/1', soldAt: '2026-09-24T00:00:00.000Z' });
  assert.deepEqual(pendingStates, [true, false]);
  assert.equal(activeIds.size, 0);
});

test('availability failures have clear ownership, missing, and network messages', () => {
  assert.equal(getAvailabilityErrorMessage({ status: 403 }), 'You do not own this listing');
  assert.equal(
    getAvailabilityErrorMessage({ status: 404 }),
    'This listing no longer exists. Refresh the page to update your listings.',
  );
  assert.equal(
    getAvailabilityErrorMessage(new TypeError('Failed to fetch')),
    'Unable to update this listing. Check your connection and try again.',
  );
});
