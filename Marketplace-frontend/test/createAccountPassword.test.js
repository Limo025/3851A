import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));

test('create account renders a real form with the required password composition controls', async (t) => {
  const vite = await createServer({
    root: frontendRoot,
    server: { middlewareMode: true },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
  });
  t.after(() => vite.close());
  const originalDocument = globalThis.document;
  globalThis.document = { title: '' };
  t.after(() => { globalThis.document = originalDocument; });

  const { default: CreateAccount } = await vite.ssrLoadModule('/src/pages/CreateAccount.jsx');
  const html = renderToStaticMarkup(React.createElement(
    MemoryRouter,
    null,
    React.createElement(CreateAccount),
  ));

  assert.match(html, /<form[^>]*>/);
  assert.match(html, /type="password"[^>]*minLength="9"/);
  assert.match(html, /type="password"[^>]*maxLength="128"/);
  assert.match(html, /type="password"[^>]*pattern=/);
  assert.match(html, /<button[^>]*type="submit"[^>]*>Create Account<\/button>/);
});
