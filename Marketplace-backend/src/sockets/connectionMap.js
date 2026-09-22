const activeConnections = new Map();

export function addConnection(userId, socket) {
    let sockets = activeConnections.get(userId);
    if (!sockets) {
        sockets = new Set();
        activeConnections.set(userId, sockets);
    }

    sockets.add(socket);
}
export function removeConnection(userId, socket) {
  const sockets = activeConnections.get(userId);
  if (!sockets) return;

  sockets.delete(socket);

  if (sockets.size === 0) {
    activeConnections.delete(userId);
  }
}

export function getConnections(userId) {
  return activeConnections.get(userId) ?? new Set();
}
