async function verifyToken(req, res, next) {
  const { verifyToken: authenticate } = await import('./auth.js');
  return authenticate(req, res, next);
}

export function createOptionalAuth(authenticate = verifyToken) {
  return (req, res, next) => (
    req.headers?.authorization ? authenticate(req, res, next) : next()
  );
}

export default createOptionalAuth();
