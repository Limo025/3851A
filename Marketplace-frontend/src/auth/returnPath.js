export function buildReturnPath({ pathname = '/', search = '', hash = '' } = {}) {
  return `${pathname}${search}${hash}`;
}

export function getLoginRedirect(hasSession, location) {
  if (hasSession) return null;

  return {
    to: '/login',
    replace: true,
    state: {
      from: buildReturnPath(location),
      message: 'Please log in to access seller tools.',
    },
  };
}

export function getPostLoginPath(state) {
  const candidate = state?.from;
  const hasControlCharacter = typeof candidate === 'string'
    && Array.from(candidate).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    });
  if (
    typeof candidate !== 'string'
    || !candidate.startsWith('/')
    || candidate.startsWith('//')
    || candidate.includes('\\')
    || hasControlCharacter
  ) {
    return '/';
  }

  try {
    const appOrigin = 'https://marketplace.invalid';
    const resolved = new URL(candidate, appOrigin);
    if (
      resolved.origin !== appOrigin
      || !resolved.pathname.startsWith('/')
      || resolved.pathname.startsWith('//')
    ) {
      return '/';
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return '/';
  }
}
