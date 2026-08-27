import test from 'node:test';
import assert from 'node:assert/strict';
import { createImageStorage } from '../src/services/imageStorage.js';

const config = {
  cloudName: 'demo-cloud',
  apiKey: 'test-key',
  apiSecret: 'top-secret',
};
const fixedNow = () => 1_700_000_000_123;

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

test('uploadImages sends signed Cloudinary uploads and maps secure responses', async () => {
  const requests = [];
  const store = createImageStorage({
    config,
    now: fixedNow,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return jsonResponse({ secure_url: 'https://cdn.test/a.webp', public_id: 'marketplace/a' });
    },
  });

  const result = await store.uploadImages([{
    buffer: Buffer.from('image-data'),
    originalname: 'desk.webp',
    mimetype: 'image/webp',
  }]);

  assert.deepEqual(result, [{ url: 'https://cdn.test/a.webp', publicId: 'marketplace/a' }]);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.body.get('api_key'), 'test-key');
  assert.equal(requests[0].options.body.get('folder'), 'marketplace/listings');
  assert.equal(requests[0].options.body.get('timestamp'), '1700000000');
  assert.equal(requests[0].options.body.get('signature'), '594e9226a569ac935f80f8cc0b7d2ea0c5d1165b');

  const uploadedFile = requests[0].options.body.get('file');
  assert.equal(uploadedFile.name, 'desk.webp');
  assert.equal(await uploadedFile.text(), 'image-data');
});

test('uploadImages cleans up prior assets when a later upload fails', async () => {
  const requests = [];
  const store = createImageStorage({
    config,
    now: fixedNow,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (requests.length === 1) {
        return jsonResponse({ secure_url: 'https://cdn.test/a.webp', public_id: 'marketplace/a' });
      }
      if (requests.length === 2) {
        return jsonResponse({ error: { message: 'upload refused' } }, { ok: false, status: 400 });
      }
      return jsonResponse({ result: 'ok' });
    },
  });

  await assert.rejects(
    store.uploadImages([
      { buffer: Buffer.from('one'), originalname: 'one.webp', mimetype: 'image/webp' },
      { buffer: Buffer.from('two'), originalname: 'two.webp', mimetype: 'image/webp' },
    ]),
    (error) => error instanceof Error && !error.message.includes('top-secret'),
  );

  assert.equal(requests.length, 3);
  assert.equal(requests[2].url, 'https://api.cloudinary.com/v1_1/demo-cloud/image/destroy');
  assert.equal(requests[2].options.body.get('public_id'), 'marketplace/a');
  assert.equal(requests[2].options.body.get('signature'), '9ef481ae9c697a137f96f62d2f73547ba1f01a60');
});

test('deleteImages attempts every asset and reports aggregate destroy failures', async () => {
  const requests = [];
  const store = createImageStorage({
    config,
    now: fixedNow,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      const publicId = options.body.get('public_id');
      return publicId === 'marketplace/b'
        ? jsonResponse({ error: { message: 'destroy refused' } }, { ok: false, status: 500 })
        : jsonResponse({ result: 'ok' });
    },
  });

  await assert.rejects(store.deleteImages(['marketplace/a', 'marketplace/b']), AggregateError);

  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'https://api.cloudinary.com/v1_1/demo-cloud/image/destroy');
  assert.deepEqual(requests.map(({ options }) => options.body.get('public_id')).sort(), ['marketplace/a', 'marketplace/b']);
});
