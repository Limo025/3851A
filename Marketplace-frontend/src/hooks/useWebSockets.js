import { useEffect, useRef, useState, useCallback } from 'react';

export const useWebSocket = (token) => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    // 1. Establish connection with session token in query params
    const wsUrl = `ws://localhost:5000?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Handle incoming message event
      if (data.type === 'NEW_MESSAGE') {
        setMessages((prevMessages) => [...prevMessages, data.payload]);
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
      ws.close();
    };
  }, [token]);

  // Function to transmit message frame to backend
  const sendMessage = useCallback((recipientId, text) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'SEND_MESSAGE',
        payload: { recipientId, text },
      };
      socketRef.current.send(JSON.stringify(payload));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  return { isConnected, messages, setMessages, sendMessage };
};