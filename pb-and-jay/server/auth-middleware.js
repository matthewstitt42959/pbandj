import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'pbandj-secret';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Keep id/email shape so existing endpoints work without changes
    req.authUser = { id: payload.userId, email: payload.email, username: payload.username, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired — please sign in again' });
  }
}
