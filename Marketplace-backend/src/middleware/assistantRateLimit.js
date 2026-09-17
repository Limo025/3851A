export function createAssistantRateLimiter({
  windowMs = 60_000,
  maxRequests = 20,
  maxKeys = 10_000,
  now = Date.now,
} = {}) {
  const entries = new Map();

  return function assistantRateLimit(req, res, next) {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const timestamp = now();
    const current = entries.get(key);
    const entry = !current || timestamp - current.startedAt >= windowMs
      ? { startedAt: timestamp, count: 0 }
      : current;

    entry.count += 1;
    entries.delete(key);
    entries.set(key, entry);

    while (entries.size > maxKeys) {
      entries.delete(entries.keys().next().value);
    }

    if (entry.count > maxRequests) {
      res.set('Retry-After', String(Math.ceil((entry.startedAt + windowMs - timestamp) / 1000)));
      return res.status(429).json({
        error: 'Too many assistant requests. Please try again shortly.',
      });
    }

    return next();
  };
}

export default createAssistantRateLimiter();
