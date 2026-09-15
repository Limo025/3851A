import { WebSocketServer } from 'ws';
import { verifyFirebaseToken } from '../utils/verifyToken.js';
import { handleMessage } from '../sockets/messageRouter.js';
import { addConnection, removeConnection } from '../sockets/connectionMap.js';

export const setupWebSocket = (server) => {
  const wss = new WebSocketServer({ noServer: true });
  
  server.on('upgrade', async (req, socket, head) => {
    // Parse query parameter
    const searchParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const token = urlParams.get('token');
    // Authentication with Firebase
    const user = await verifyFirebaseToken(token); 
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized');
      socket.destroy();
      return;
    }
    // Handshake and attach id to connection
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.userId = user.id; // user.id is decodedToken.uid
      wss.emit('connection', ws);
    });
  });

  wss.on('connection', (ws) => {
    addConnection(ws.userId, ws);

    ws.on('message', (data) => handleMessage(ws, data));
    ws.on('close', () => removeConnection(ws.userId));
  });
};