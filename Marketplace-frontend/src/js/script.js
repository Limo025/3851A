import { session } from '../auth/session.js';
import { initializeSidebar } from './sidebar.js';

export function buildMarketplaceSearchUrl(rawQuery) {
  const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
  return query ? '/marketplace?search=' + encodeURIComponent(query) : null;
}

export function getMarketplaceSearchTerm({ pathname = '', search = '' } = {}) {
  if (pathname !== '/marketplace') {
    return '';
  }

  return new URLSearchParams(search).get('search') || '';
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
  const logoutButton = documentRef.getElementById('logOut');
  const sidebar = documentRef.getElementById('sidebar');
  const sidebarToggle = documentRef.getElementById('sidebarToggle');
  const sidebarClose = documentRef.getElementById('sidebarClose');

  if (!searchForm || !searchInput || !accountLink || !accountImage || !logoutButton
    || !sidebar || !sidebarToggle || !sidebarClose) {
    return () => {};
  }

  searchInput.value = getMarketplaceSearchTerm(windowRef.location);

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
  const unsubscribe = sessionManager.subscribe?.(applyAuthView) ?? (() => {});

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const destination = buildMarketplaceSearchUrl(searchInput.value);
    if (destination) {
      windowRef.location.assign(destination);
    }
  };
  const handleLogout = () => logout(sessionManager, windowRef.location);

  searchForm.addEventListener('submit', handleSearchSubmit);
  logoutButton.addEventListener('click', handleLogout);
  const teardownSidebar = initializeSidebar({
    sidebar,
    toggle: sidebarToggle,
    close: sidebarClose,
    documentRef,
  });

  return () => {
    unsubscribe();
    teardownSidebar();
    searchForm.removeEventListener('submit', handleSearchSubmit);
    logoutButton.removeEventListener('click', handleLogout);
  };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const start = () => initializeHeader({ documentRef: document, windowRef: window });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
