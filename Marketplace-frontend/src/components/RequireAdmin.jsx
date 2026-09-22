import { useEffect, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch } from '../api/client.js';
import { session } from '../auth/session.js';

export default function RequireAdmin({ children }) {
  const navigate = useNavigate();
  const hasSession = useSyncExternalStore(session.subscribe, session.hasSession);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    function denyAccess() {
      setAllowed(false);
      navigate('/', { replace: true });
      toast.error('Something went wrong. Please try again.', { id: 'admin-access-error' });
    }

    if (!hasSession) {
      denyAccess();
      return () => controller.abort();
    }

    apiFetch('/api/admin/me', { auth: true, signal: controller.signal })
      .then(() => { if (!controller.signal.aborted) setAllowed(true); })
      .catch(() => { if (!controller.signal.aborted) denyAccess(); });

    return () => controller.abort();
  }, [hasSession, navigate]);

  return hasSession && allowed ? children : null;
}
