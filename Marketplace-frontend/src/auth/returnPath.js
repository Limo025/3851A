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
