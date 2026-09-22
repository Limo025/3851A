import WebSocket from 'ws';
import { getConnections } from './connectionMap.js';

export function broadcastMessage(recipientId, message, conversation) {
  const sockets = getConnections(recipientId);
  let delivered = false;

  const event = JSON.stringify({
    type: 'NEW_MESSAGE',
    payload: { message, conversation },
  });

  for (const socket of sockets) {
    if (socket.readyState !== WebSocket.OPEN) continue;

    try {
      socket.send(event);
      delivered = true;
    } catch (error) {
      console.error('WebSocket broadcast failed:', error);
    }
  }
  return delivered;
}