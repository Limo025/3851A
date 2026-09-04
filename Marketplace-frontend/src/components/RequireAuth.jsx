import { Navigate, useLocation } from 'react-router-dom';
import { session } from '../auth/session.js';
import { getLoginRedirect } from '../auth/returnPath.js';

export default function RequireAuth({ children }) {
  const location = useLocation();
  const redirect = getLoginRedirect(session.hasSession(), location);

  if (redirect) {
    return <Navigate {...redirect} />;
  }

  return children;
}
