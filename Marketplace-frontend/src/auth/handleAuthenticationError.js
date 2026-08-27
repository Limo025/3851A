import { AuthenticationError } from './session.js';
import { getLoginRedirect, getPostLoginPath } from './returnPath.js';

export function handleAuthenticationError(error, { sessionManager, navigate, returnPath }) {
  if (!(error instanceof AuthenticationError)) return false;

  sessionManager.clear();
  const safeReturnPath = getPostLoginPath({ from: returnPath });
  const redirect = getLoginRedirect(false, { pathname: safeReturnPath });
  navigate(redirect.to, { replace: redirect.replace, state: redirect.state });
  return true;
}
