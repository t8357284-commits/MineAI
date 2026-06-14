const logger = require('../utils/logger');

/**
 * Simple API key auth middleware.
 * Set API_SECRET_KEY in .env to enable.
 * If not set, middleware passes through (open mode for dev).
 */
function authMiddleware(req, res, next) {
  const secretKey = process.env.API_SECRET_KEY;

  // If no secret configured, skip auth (dev mode)
  if (!secretKey) return next();

  const providedKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!providedKey || providedKey !== secretKey) {
    logger.warn(`Unauthorized request from ${req.ip} to ${req.path}`);
    return res.status(401).json({ error: 'Unauthorized — Invalid or missing API key' });
  }

  next();
}

module.exports = { authMiddleware };
