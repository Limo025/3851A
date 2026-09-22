import { useEffect, useState } from 'react';
import { session } from '../auth/session.js';
import { useWebSocket } from '../hooks/useWebSockets.js';

export default function ChatSocket() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    let active = true;
    let requestNumber = 0;

    async function updateToken() {
      const currentRequest = ++requestNumber;

      try {
        const nextToken = await session.getAccessToken();

        if (active && currentRequest === requestNumber) {
          setToken(nextToken);
        }
      } catch {
        if (active && currentRequest === requestNumber) {
          setToken(null);
        }
      }
    }

    updateToken();
    const unsubscribe = session.subscribe(updateToken);

    return () => {
      active = false;
      requestNumber += 1;
      unsubscribe();
    };
  }, []);

  useWebSocket(token);

  return null;
}