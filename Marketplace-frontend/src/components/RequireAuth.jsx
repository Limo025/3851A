import { Navigate, useLocation } from 'react-router-dom';
import { useSyncExternalStore } from 'react';
import { session } from '../auth/session.js';
import { getLoginRedirect } from '../auth/returnPath.js';

export default function RequireAuth({ children }) {
  const location = useLocation();
  const hasSession = useSyncExternalStore(session.subscribe, session.hasSession);
  const redirect = getLoginRedirect(hasSession, location);

  if (redirect) {
    return <Navigate {...redirect} />;
  }

  return children;
}
