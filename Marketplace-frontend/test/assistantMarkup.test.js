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

const EXPLICIT_ROUTE_SIGNATURES = Object.freeze([
  '<Routepath="/"element={<Home/>}/>',
  '<Routepath="/login"element={<Login/>}/>',
  '<Routepath="/forgot-password"element={<ForgotPassword/>}/>',
  '<Routepath="/item"element={<Item/>}/>',
  '<Routepath="/createAccount"element={<CreateAccount/>}/>',
  '<Routepath="/search"element={<Search/>}/>',
  '<Routepath="/messages"element={<Messages/>}/>',
  '<Routepath="/settings"element={<Settings/>}/>',
  '<Routepath="/about"element={<About/>}/>',
  '<Routepath="/sell"element={<Sell/>}/>',
  '<Routepath="/watchlist"element={<Watchlist/>}/>',
  '<Routepath="/categories"element={<Categories/>}/>',
  '<Routepath="/marketplace"element={<Marketplace/>}/>',
  '<Routepath="/listings/:id"element={<ListingDetail/>}/>',
  '<Routepath="/sell"element={<RequireAuth><CreateListing/></RequireAuth>}/>',
  '<Routepath="/my-listings"element={<RequireAuth><MyListings/></RequireAuth>}/>',
  '<Routepath="/listings/:id/edit"element={<RequireAuth><EditListing/></RequireAuth>}/>',
  '<Routepath="*"element={<NotFound/>}/>',
]);

function assertAssistantMountPreservesRoutes(mainSource) {
  assert.equal((mainSource.match(/<ChatWidget\s*\/>/g) || []).length, 1);
  assert.match(mainSource, /<BrowserRouter>\s*<ChatWidget\s*\/>\s*<Routes>/);

  const routeContents = mainSource.match(/<Routes>([\s\S]*?)<\/Routes>/)?.[1];
  assert.notEqual(routeContents, undefined);
  assert.doesNotMatch(routeContents, /ChatWidget/);

  const normalizedRoutes = routeContents.replace(/\s+/g, '');
  if (normalizedRoutes === '{APP_ROUTES.map(renderRoute)}') return;

  assert.equal((routeContents.match(/<Route\s/g) || []).length, EXPLICIT_ROUTE_SIGNATURES.length);
  for (const signature of EXPLICIT_ROUTE_SIGNATURES) {
    assert.ok(normalizedRoutes.includes(signature), `Missing route signature: ${signature}`);
  }
}

test('mounts one assistant outside the route definitions', async () => {
  const mainSource = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');

  assertAssistantMountPreservesRoutes(mainSource);
});

test('accepts the complete committed explicit route representation', () => {
  const explicitMainFixture = `
    <BrowserRouter>
      <ChatWidget />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/item" element={<Item />} />
        <Route path="/createAccount" element={<CreateAccount />} />
        <Route path="/search" element={<Search />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<About />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/listings/:id" element={<ListingDetail />} />
        <Route path="/sell" element={<RequireAuth><CreateListing /></RequireAuth>} />
        <Route path="/my-listings" element={<RequireAuth><MyListings /></RequireAuth>} />
        <Route path="/listings/:id/edit" element={<RequireAuth><EditListing /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  `;

  assertAssistantMountPreservesRoutes(explicitMainFixture);
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
