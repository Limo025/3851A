const APPEAL_CONTEXT_KEY = 'marketplace.appeal';
const DEFAULT_APPEAL_LIFETIME_SECONDS = 3600;

function browserStorage() {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function createAppealContextManager({ storage, now = Date.now } = {}) {
  const getStorage = () => storage ?? browserStorage();

  function clear() {
    getStorage()?.removeItem(APPEAL_CONTEXT_KEY);
  }

  function save(token, reason = '', expiresIn = DEFAULT_APPEAL_LIFETIME_SECONDS) {
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    const lifetimeSeconds = Number(expiresIn);

    if (!normalizedToken || !Number.isFinite(lifetimeSeconds) || lifetimeSeconds <= 0) {
      clear();
      return;
    }

    getStorage()?.setItem(APPEAL_CONTEXT_KEY, JSON.stringify({
      token: normalizedToken,
      reason: typeof reason === 'string' ? reason : '',
      expiresAt: now() + lifetimeSeconds * 1000,
    }));
  }

  function read() {
    const activeStorage = getStorage();
    if (!activeStorage) return null;

    try {
      const context = JSON.parse(activeStorage.getItem(APPEAL_CONTEXT_KEY) || 'null');
      if (
        !context
        || typeof context.token !== 'string'
        || !context.token.trim()
        || typeof context.reason !== 'string'
        || !Number.isFinite(context.expiresAt)
        || context.expiresAt <= now()
      ) {
        clear();
        return null;
      }
      return context;
    } catch {
      clear();
      return null;
    }
  }

  return {
    save,
    clear,
    getToken: () => read()?.token ?? null,
    getReason: () => read()?.reason ?? '',
  };
}

export const appealContext = createAppealContextManager();

export function setAppealToken(token, reason = '', expiresIn) {
  appealContext.save(token, reason, expiresIn);
}

export function clearAppealContext() {
  appealContext.clear();
}

export function getAppealToken() {
  return appealContext.getToken();
}

export function getBanReason() {
  return appealContext.getReason();
}

export function notifyBan(token, reason = '') {
  setAppealToken(token, reason);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('marketplace:banned'));
}
