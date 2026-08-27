import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { handleUploadError, listingImagesUpload } from '../src/middleware/upload.js';

async function withUploadApp(run) {
  const app = express();
  app.post('/upload', listingImagesUpload, (req, res) => {
    res.json({
      body: req.body,
      files: req.files.map(({ originalname, mimetype, size }) => ({ originalname, mimetype, size })),
    });
  });
  app.use(handleUploadError);

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  try {
    return await run(`http://127.0.0.1:${port}/upload`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

function imageForm({ type, name = 'photo', contents = 'image', field = 'images' } = {}) {
  const form = new FormData();
  form.append('title', 'Desk lamp');
  form.append(field, new Blob([contents], { type }), `${name}.${type.split('/')[1]}`);
  return form;
}

test('listingImagesUpload accepts JPEG, PNG, and WebP images with form fields', async () => {
  await withUploadApp(async (url) => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      const response = await fetch(url, { method: 'POST', body: imageForm({ type }) });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        body: { title: 'Desk lamp' },
        files: [{ originalname: `photo.${type.split('/')[1]}`, mimetype: type, size: 5 }],
      });
    }
  });
});

test('listingImagesUpload rejects GIF and PDF files', async () => {
  await withUploadApp(async (url) => {
    for (const type of ['image/gif', 'application/pdf']) {
      const response = await fetch(url, { method: 'POST', body: imageForm({ type }) });
      assert.equal(response.status, 400);
      assert.match((await response.json()).error, /image type/i);
    }
  });
});

test('listingImagesUpload rejects a file over five MiB', async () => {
  await withUploadApp(async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      body: imageForm({ type: 'image/jpeg', contents: Buffer.alloc(5 * 1024 * 1024 + 1) }),
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /size/i);
  });
});

test('listingImagesUpload rejects a sixth image', async () => {
  const form = new FormData();
  for (let index = 0; index < 6; index += 1) {
    form.append('images', new Blob(['image'], { type: 'image/png' }), `image-${index}.png`);
  }

  await withUploadApp(async (url) => {
    const response = await fetch(url, { method: 'POST', body: form });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /too many/i);
  });
});

test('listingImagesUpload rejects a file submitted under an unexpected field', async () => {
  await withUploadApp(async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      body: imageForm({ type: 'image/png', field: 'avatar' }),
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /images/i);
  });
});

test('listingImagesUpload reports malformed multipart input as a controlled client error', async () => {
  await withUploadApp(async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data' },
      body: 'not a multipart body',
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /multipart/i);
  });
});
