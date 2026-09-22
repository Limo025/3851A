import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/useChatStore.js';

export const useWebSocket = (token) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    // Establish connection with session token in query params
    const wsUrl = `ws://localhost:8000?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'NEW_MESSAGE') {
          useChatStore.getState().receiveMessage(data.payload);
        }
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    // Clean up connection when component unmounts
    return () => {
      socketRef.current = null;
      ws.close();
    };
  }, [token]);
  return { isConnected };
};