const SESSION_KEY = 'marketplace.auth';
const REFRESH_EARLY_MS = 30_000;

export class AuthenticationError extends Error {
  constructor(message = 'Your session has expired. Please log in again.') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

function browserStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function apiBaseUrl() {
  return import.meta.env?.VITE_API_URL || 'http://localhost:8000';
}

export function createSessionManager({ storage, fetchImpl = globalThis.fetch, now = Date.now, baseUrl = apiBaseUrl() } = {}) {
  const getStorage = () => storage ?? browserStorage();

  function readSession() {
    const activeStorage = getStorage();
    if (!activeStorage) {
      return null;
    }

    try {
      return JSON.parse(activeStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      activeStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function clear() {
    getStorage()?.removeItem(SESSION_KEY);
  }

  function saveLogin({ idToken, refreshToken, expiresIn }) {
    const activeStorage = getStorage();
    if (!activeStorage) {
      return;
    }

    activeStorage.setItem(SESSION_KEY, JSON.stringify({
      idToken,
      refreshToken,
      expiresAt: now() + Number(expiresIn) * 1000,
    }));
  }

  async function getAccessToken() {
    const current = readSession();
    if (!current?.idToken || !current.refreshToken) {
      return null;
    }

    if (current.expiresAt - now() > REFRESH_EARLY_MS) {
      return current.idToken;
    }

    try {
      const response = await fetchImpl(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!response.ok) {
        throw new Error('Session refresh failed');
      }

      const data = await response.json();
      if (!data.idToken || !data.refreshToken || !data.expiresIn) {
        throw new Error('Invalid session refresh response');
      }
      saveLogin(data);
      return data.idToken;
    } catch {
      clear();
      throw new AuthenticationError();
    }
  }

  return {
    saveLogin,
    hasSession: () => Boolean(readSession()),
    getAccessToken,
    clear,
  };
}

export const session = createSessionManager();
