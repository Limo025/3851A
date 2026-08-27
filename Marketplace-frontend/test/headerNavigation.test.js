import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMarketplaceSearchUrl,
  getHeaderAuthView,
  logout,
} from '../src/js/script.js';
import { createSidebarController } from '../src/js/sidebar.js';

test('header search trims and safely encodes a marketplace query', () => {
  assert.equal(
    buildMarketplaceSearchUrl('  desk & chair  '),
    '/marketplace?search=desk%20%26%20chair',
  );
  assert.equal(buildMarketplaceSearchUrl('   '), null);
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
