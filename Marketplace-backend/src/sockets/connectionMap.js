const activeConnections = new Map();

export const addConnection = (userId, ws) => activeConnections.set(userId, ws);
export const removeConnection = (userId) => activeConnections.delete(userId);
export const getConnection = (userId) => activeConnections.get(userId);