import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/useChatStore.js';
import { session } from '../auth/session.js';

export const useWebSocket = (token) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    let active = true;
    let retryTimer;
    let retryCount = 0;

    async function connect() {
      let accessToken;
      try {
        accessToken = await session.getAccessToken();
      } catch {
        return;
      }
      if (!active || !accessToken) return;

      const apiUrl = new URL(import.meta.env.VITE_API_URL || 'http://localhost:8000');
      apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      apiUrl.pathname = '/';
      apiUrl.search = '';
      apiUrl.searchParams.set('token', accessToken);

      const ws = new WebSocket(apiUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!active) return;
        retryCount = 0;
        setIsConnected(true);
        useChatStore.getState().loadUnreadConversations();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_MESSAGE') {
            useChatStore.getState().receiveMessage(data.payload);
          }
        } catch (error) {
          console.error('Could not process WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        if (!active) return;
        socketRef.current = null;
        setIsConnected(false);
        retryTimer = window.setTimeout(connect, Math.min(1000 * 2 ** retryCount++, 30000));
      };

      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      active = false;
      window.clearTimeout(retryTimer);
      const ws = socketRef.current;
      socketRef.current = null;
      ws?.close();
    };
  }, [token]);
  return { isConnected };
};
