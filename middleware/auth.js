const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'itinerate-dev-secret-change-in-production';

/**
 * Express middleware — validates Bearer JWT and attaches user payload to req.user
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;   // { id, email, firstName }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * Express middleware — requires valid JWT AND is_admin flag set in the database.
 * Always re-checks the DB so privilege changes take effect without re-login.
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const { getDB } = require('../db');
    const user = getDB().prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin, JWT_SECRET };
