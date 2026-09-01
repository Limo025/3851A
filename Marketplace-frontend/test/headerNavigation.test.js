import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMarketplaceSearchUrl,
  getMarketplaceSearchTerm,
  getHeaderAuthView,
  initializeHeader,
  logout,
} from '../src/js/script.js';
import { createSidebarController, initializeSidebar } from '../src/js/sidebar.js';

function createEventNode({ hidden = false, children = [] } = {}) {
  const listeners = new Map();
  const attributes = new Map();

  return {
    alt: '',
    hidden,
    href: '',
    value: '',
    addEventListener(type, listener) {
      const typeListeners = listeners.get(type) || new Set();
      typeListeners.add(listener);
      listeners.set(type, typeListeners);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type, event = {}) {
      for (const listener of [...(listeners.get(type) || [])]) {
        listener(event);
      }
    },
    contains(target) {
      return target === this || children.includes(target);
    },
    focus() {},
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    getAttribute(name) {
      return attributes.get(name);
    },
  };
}

test('header search trims and safely encodes a marketplace query', () => {
  assert.equal(
    buildMarketplaceSearchUrl('  desk & chair  '),
    '/marketplace?search=desk%20%26%20chair',
  );
  assert.equal(buildMarketplaceSearchUrl('   '), null);
});

test('header search reflects the active marketplace query without leaking it onto other pages', () => {
  assert.equal(
    getMarketplaceSearchTerm({ pathname: '/marketplace', search: '?search=desk%20lamp&category=Furniture' }),
    'desk lamp',
  );
  assert.equal(getMarketplaceSearchTerm({ pathname: '/messages', search: '?search=private' }), '');
});

test('header auth view exposes seller navigation only for an active session', () => {
  assert.deepEqual(getHeaderAuthView(false), {
    accountHref: '/login',
    accountLabel: 'Log in',
    showSellerLinks: false,
    showLoginLink: true,
    showLogoutButton: false,
  });
  assert.deepEqual(getHeaderAuthView(true), {
    accountHref: '/my-listings',
    accountLabel: 'My listings',
    showSellerLinks: true,
    showLoginLink: false,
    showLogoutButton: true,
  });
});

test('logout clears only the app session and returns to the local home route', () => {
  let clearCalls = 0;
  const destinations = [];

  logout(
    { clear: () => { clearCalls += 1; } },
    { assign: (path) => destinations.push(path) },
  );

  assert.equal(clearCalls, 1);
  assert.deepEqual(destinations, ['/']);
});

test('sidebar controller keeps visibility, ARIA, Escape, and focus in sync', () => {
  const sidebar = {
    hidden: true,
    contains: () => false,
  };
  const attributes = new Map();
  let toggleFocusCalls = 0;
  let closeFocusCalls = 0;
  const toggle = {
    setAttribute: (name, value) => attributes.set(name, value),
    focus: () => { toggleFocusCalls += 1; },
  };
  const close = {
    focus: () => { closeFocusCalls += 1; },
  };
  const controller = createSidebarController({ sidebar, toggle, close });

  controller.open();
  assert.equal(sidebar.hidden, false);
  assert.equal(attributes.get('aria-expanded'), 'true');
  assert.equal(closeFocusCalls, 1);

  let prevented = false;
  controller.handleKeyDown({
    key: 'Escape',
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, true);
  assert.equal(sidebar.hidden, true);
  assert.equal(attributes.get('aria-expanded'), 'false');
  assert.equal(toggleFocusCalls, 1);
});

test('sidebar closes only for outside pointer interaction and removes the document listener on teardown', () => {
  const insideTarget = {};
  const toggleTarget = {};
  const outsideTarget = {};
  const sidebar = createEventNode({ hidden: true, children: [insideTarget] });
  let toggleFocusCalls = 0;
  const toggle = createEventNode({ children: [toggleTarget] });
  toggle.focus = () => { toggleFocusCalls += 1; };
  const close = createEventNode();
  const documentRef = createEventNode();
  const teardown = initializeSidebar({ sidebar, toggle, close, documentRef });

  toggle.dispatch('click');
  documentRef.dispatch('pointerdown', { target: insideTarget });
  assert.equal(sidebar.hidden, false);
  documentRef.dispatch('pointerdown', { target: toggleTarget });
  assert.equal(sidebar.hidden, false);

  documentRef.dispatch('pointerdown', { target: outsideTarget });
  assert.equal(sidebar.hidden, true);
  assert.equal(toggleFocusCalls, 0);

  toggle.dispatch('click');
  teardown();
  documentRef.dispatch('pointerdown', { target: outsideTarget });
  assert.equal(sidebar.hidden, false);
});

test('header cleanup unsubscribes and removes every listener registered during initialization', () => {
  const elements = {
    headerSearch: createEventNode(),
    headerSearchInput: createEventNode(),
    accountLink: createEventNode(),
    accountImage: createEventNode(),
    logoutButton: createEventNode(),
    sidebar: createEventNode({ hidden: true }),
    sidebarToggle: createEventNode(),
    sidebarClose: createEventNode(),
  };
  const sellerLink = createEventNode();
  const anonymousLink = createEventNode();
  const documentRef = createEventNode();
  documentRef.getElementById = (id) => elements[id];
  documentRef.querySelectorAll = (selector) => (
    selector === '[data-auth="seller"]' ? [sellerLink] : [anonymousLink]
  );
  const destinations = [];
  let clearCalls = 0;
  let unsubscribeCalls = 0;
  const cleanup = initializeHeader({
    documentRef,
    windowRef: { location: { assign: (path) => destinations.push(path) } },
    sessionManager: {
      clear: () => { clearCalls += 1; },
      hasSession: () => false,
      subscribe: () => () => { unsubscribeCalls += 1; },
    },
  });

  elements.headerSearchInput.value = 'desk';
  elements.headerSearch.dispatch('submit', { preventDefault() {} });
  elements.logoutButton.dispatch('click');
  assert.deepEqual(destinations, ['/marketplace?search=desk', '/']);
  assert.equal(clearCalls, 1);

  cleanup();
  elements.headerSearch.dispatch('submit', { preventDefault() {} });
  elements.logoutButton.dispatch('click');

  assert.deepEqual(destinations, ['/marketplace?search=desk', '/']);
  assert.equal(clearCalls, 1);
  assert.equal(unsubscribeCalls, 1);
});
