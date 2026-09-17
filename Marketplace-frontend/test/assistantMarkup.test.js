import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { AuthenticationError } from '../src/auth/session.js';
import { handleAssistantAuthenticationError } from '../src/assistant/assistantAuthentication.js';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));

test('mounts one assistant outside the route definitions', async () => {
  const mainSource = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');

  assert.equal((mainSource.match(/<ChatWidget\s*\/>/g) || []).length, 1);
  assert.match(mainSource, /<BrowserRouter>\s*<ChatWidget\s*\/>\s*<Routes>/);
  assert.match(mainSource, /<Routes>\s*{APP_ROUTES\.map\(renderRoute\)}\s*<\/Routes>/);
});

test('widget authentication handling unlocks before login navigation', async () => {
  const widgetSource = await readFile(new URL('../src/assistant/ChatWidget.jsx', import.meta.url), 'utf8');
  const effects = [];

  const handled = handleAssistantAuthenticationError(new AuthenticationError(), {
    dispatch: (action) => effects.push({ type: 'dispatch', action }),
    navigate: (path, options) => effects.push({ type: 'navigate', path, options }),
    returnPath: '/marketplace?page=2',
  });

  assert.equal(handled, true);
  assert.deepEqual(effects, [
    {
      type: 'dispatch',
      action: {
        type: 'authentication-required',
        payload: { error: 'Please log in to prepare a listing draft.' },
      },
    },
    {
      type: 'navigate',
      path: '/login',
      options: {
        state: {
          from: '/marketplace?page=2',
          message: 'Please log in to prepare a listing draft.',
        },
      },
    },
  ]);
  assert.match(
    widgetSource,
    /handleAssistantAuthenticationError\(error, {\s*dispatch,\s*navigate,\s*returnPath: location\.pathname,\s*}\)/,
  );
});

test('renders an accessible English assistant panel with safe, bounded marketplace results', async (t) => {
  const vite = await createServer({
    root: frontendRoot,
    server: { middlewareMode: true },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
  });
  t.after(() => vite.close());
  const { default: ChatPanel } = await vite.ssrLoadModule('/src/assistant/ChatPanel.jsx');
  const listings = Array.from({ length: 6 }, (_, index) => ({
    id: `listing-${index + 1}`,
    title: index === 0 ? '<script>alert("unsafe")</script>' : `Desk ${index + 1}`,
    price: 120 + index,
    condition: 'Good',
  }));

  const html = renderToStaticMarkup(React.createElement(
    MemoryRouter,
    null,
    React.createElement(ChatPanel, {
      messages: [
        { role: 'user', content: 'Find me a desk' },
        { role: 'assistant', content: 'Here are the closest matches.' },
      ],
      inventorySummary: {
        total: 8,
        minPrice: 100,
        maxPrice: 900,
        byCondition: { New: 1, 'Like New': 2, Good: 4, Fair: 1 },
      },
      listings,
      loading: false,
      error: '',
      draftReady: true,
      onSubmit() {},
      onReviewDraft() {},
      onClose() {},
    }),
  ));

  assert.match(html, /Marketplace assistant/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /role="log"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /8 matching listings/);
  assert.match(html, /AUD 100–900/);
  assert.match(html, /New: 1/);
  assert.match(html, /Like New: 2/);
  assert.match(html, /Good: 4/);
  assert.match(html, /Fair: 1/);
  assert.equal((html.match(/View listing/g) || []).length, 5);
  assert.match(html, /href="\/listings\/listing-5"/);
  assert.doesNotMatch(html, /listing-6/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert/);
  assert.match(html, /Review listing draft/);
  assert.match(html, /Message the marketplace assistant/);
});
