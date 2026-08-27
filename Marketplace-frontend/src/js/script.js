import { session } from '../auth/session.js';
import { initializeSidebar } from './sidebar.js';

export function buildMarketplaceSearchUrl(rawQuery) {
  const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
  return query ? '/marketplace?search=' + encodeURIComponent(query) : null;
}

export function getHeaderAuthView(hasSession) {
  return hasSession
    ? {
        accountHref: '/my-listings',
        accountLabel: 'My listings',
        showSellerLinks: true,
        showLoginLink: false,
        showLogoutButton: true,
      }
    : {
        accountHref: '/login',
        accountLabel: 'Log in',
        showSellerLinks: false,
        showLoginLink: true,
        showLogoutButton: false,
      };
}

export function logout(sessionManager, location) {
  sessionManager.clear();
  location.assign('/');
}

export function initializeHeader({ documentRef, windowRef, sessionManager = session }) {
  const searchForm = documentRef.getElementById('headerSearch');
  const searchInput = documentRef.getElementById('headerSearchInput');
  const accountLink = documentRef.getElementById('accountLink');
  const accountImage = documentRef.getElementById('accountImage');
  const logoutButton = documentRef.getElementById('logoutButton');
  const sidebar = documentRef.getElementById('sidebar');
  const sidebarToggle = documentRef.getElementById('sidebarToggle');
  const sidebarClose = documentRef.getElementById('sidebarClose');

  if (!searchForm || !searchInput || !accountLink || !accountImage || !logoutButton
    || !sidebar || !sidebarToggle || !sidebarClose) {
    return;
  }

  function applyAuthView() {
    const view = getHeaderAuthView(sessionManager.hasSession());
    accountLink.href = view.accountHref;
    accountLink.setAttribute('aria-label', view.accountLabel);
    accountImage.alt = '';

    for (const link of documentRef.querySelectorAll('[data-auth="seller"]')) {
      link.hidden = !view.showSellerLinks;
    }
    for (const link of documentRef.querySelectorAll('[data-auth="anonymous"]')) {
      link.hidden = !view.showLoginLink;
    }
    logoutButton.hidden = !view.showLogoutButton;
  }

  applyAuthView();
  sessionManager.subscribe?.(applyAuthView);

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const destination = buildMarketplaceSearchUrl(searchInput.value);
    if (destination) {
      windowRef.location.assign(destination);
    }
  });

  logoutButton.addEventListener('click', () => logout(sessionManager, windowRef.location));
  initializeSidebar({ sidebar, toggle: sidebarToggle, close: sidebarClose });
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const start = () => initializeHeader({ documentRef: document, windowRef: window });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
