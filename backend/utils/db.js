const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 12;

/**
 * Hash a password using bcrypt (12 rounds).
 * Returns a bcrypt hash string (no manual salt needed — bcrypt embeds it).
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Sync version for migration scripts only. Prefer async in routes.
 */
function hashPasswordSync(password) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

/**
 * Verify a plaintext password against a stored hash.
 * Supports both bcrypt hashes and the legacy PBKDF2 "salt:hash" format.
 */
async function verifyPassword(password, stored) {
  if (!stored) return false;

  // Legacy PBKDF2 format: "salt:hexhash" (no $ prefix)
  if (!stored.startsWith('$') && stored.includes(':')) {
    const crypto = require('crypto');
    const [salt, hash] = stored.split(':');
    const candidate = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
    } catch {
      return false;
    }
  }

  // Modern bcrypt hash
  return bcrypt.compare(password, stored);
}

/**
 * Strip sensitive fields from a user object before sending to client.
 */
function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = { hashPassword, hashPasswordSync, verifyPassword, publicUser };
