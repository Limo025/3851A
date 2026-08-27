import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReturnPath, getLoginRedirect } from '../src/auth/returnPath.js';
import {
  buildListingFormData,
  createImagePreviews,
  revokeImagePreviews,
  runSingleSubmission,
  validateImageSelection,
  validateListingValues,
} from '../src/utils/listingForm.js';

function imageFile(name, { size = 1024, type = 'image/jpeg' } = {}) {
  return new File([new Uint8Array(size)], name, { type });
}

test('protected routes preserve the complete requested return path', () => {
  assert.equal(buildReturnPath({ pathname: '/sell', search: '?draft=1', hash: '#images' }), '/sell?draft=1#images');
  assert.deepEqual(getLoginRedirect(false, { pathname: '/sell', search: '?draft=1', hash: '' }), {
    to: '/login',
    replace: true,
    state: { from: '/sell?draft=1', message: 'Please log in to access seller tools.' },
  });
  assert.equal(getLoginRedirect(true, { pathname: '/sell' }), null);
});

test('image selection accepts only supported images within the count and size limits', () => {
  const current = [imageFile('current.jpg')];
  const valid = imageFile('valid.webp', { type: 'image/webp' });

  assert.deepEqual(validateImageSelection({ retainedCount: 2, newFiles: current, selectedFiles: [valid] }), {
    files: [current[0], valid],
    error: '',
  });

  const wrongType = imageFile('notes.pdf', { type: 'application/pdf' });
  assert.equal(validateImageSelection({ retainedCount: 0, newFiles: current, selectedFiles: [wrongType] }).error, 'Images must be JPEG, PNG, or WebP files.');

  const tooLarge = imageFile('large.png', { type: 'image/png', size: 5 * 1024 * 1024 + 1 });
  assert.equal(validateImageSelection({ retainedCount: 0, newFiles: [], selectedFiles: [tooLarge] }).error, 'Each image must be 5 MB or smaller.');

  const tooMany = [1, 2, 3, 4].map((number) => imageFile(`${number}.jpg`));
  assert.equal(validateImageSelection({ retainedCount: 2, newFiles: [], selectedFiles: tooMany }).error, 'A listing can have up to 5 images.');
});

test('image preview lifecycle revokes every generated object URL', () => {
  const files = [imageFile('one.jpg'), imageFile('two.png', { type: 'image/png' })];
  const generated = [];
  const revoked = [];
  const previews = createImagePreviews(files, (file) => {
    const url = `blob:${file.name}`;
    generated.push(url);
    return url;
  });

  revokeImagePreviews(previews, (url) => revoked.push(url));

  assert.deepEqual(generated, ['blob:one.jpg', 'blob:two.png']);
  assert.deepEqual(revoked, generated);
});

test('listing form validation rejects backend-invalid fields and missing images', () => {
  assert.deepEqual(validateListingValues({
    title: 'a',
    description: 'too short',
    price: '0',
    category: 'Vehicles',
    condition: 'Broken',
  }, 0), {
    title: 'Title must be between 3 and 120 characters.',
    description: 'Description must be between 10 and 5000 characters.',
    price: 'Price must be greater than 0.',
    category: 'Select a valid category.',
    condition: 'Select a valid condition.',
    images: 'Add at least one image.',
  });
});

test('create multipart data contains listing fields and images but no client identity', () => {
  const file = imageFile('desk.jpg');
  const body = buildListingFormData({
    title: 'Study desk',
    description: 'Solid timber desk in good condition.',
    price: '75.50',
    category: 'Furniture and Home',
    condition: 'Good',
    seller: 'attacker-controlled',
  }, [file]);

  assert.equal(body.get('title'), 'Study desk');
  assert.equal(body.get('description'), 'Solid timber desk in good condition.');
  assert.equal(body.get('price'), '75.50');
  assert.equal(body.get('category'), 'Furniture and Home');
  assert.equal(body.get('condition'), 'Good');
  assert.deepEqual(body.getAll('images').map((entry) => entry.name), ['desk.jpg']);
  assert.equal(body.has('seller'), false);
  assert.equal(body.has('sellerId'), false);
});

test('submission lock ignores a repeated submit until the active request settles', async () => {
  const lock = { current: false };
  let releaseRequest;
  let calls = 0;
  const request = () => {
    calls += 1;
    return new Promise((resolve) => { releaseRequest = resolve; });
  };

  const first = runSingleSubmission(lock, request);
  const repeated = runSingleSubmission(lock, request);
  assert.equal(calls, 1);
  assert.equal(await repeated, false);

  releaseRequest('created');
  assert.equal(await first, 'created');
  assert.equal(lock.current, false);
});
