const crypto = require('crypto');

/**
 * JWT utility — HS256 with strict validation.
 *
 * Security notes:
 *  - Uses crypto.timingSafeEqual to prevent timing attacks on signature comparison.
 *  - Validates exp, iat, and nbf claims.
 *  - Rejects malformed tokens before any parsing.
 *  - Secret must be at least 32 chars (enforced at startup by server.js).
 */

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function getSecret() {
  const secret = process.env.JWT_SECRET || process.env.API_SECRET_KEY;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }
  return secret;
}

/**
 * Sign a JWT payload. The payload should include { sub, email }.
 * exp is set here; callers should NOT include exp in the payload.
 */
function sign(payload) {
  const secret = getSecret();
  const ttlDays = Math.min(Math.max(parseInt(process.env.JWT_DAYS || '14', 10), 1), 30);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    ...payload,
    iat: now,
    nbf: now,
    exp: now + ttlDays * 86400,
  };

  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(body))}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

/**
 * Verify a JWT. Returns the decoded payload or null.
 * Returns null (never throws) on any validation failure.
 */
function verify(token) {
  try {
    const secret = getSecret();
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [h, p, s] = parts;

    // Validate header
    const header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;

    // Verify signature (timing-safe)
    const data = `${h}.${p}`;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');

    const sigBuf = Buffer.from(s + '='.repeat((4 - s.length % 4) % 4), 'base64');
    const expBuf = Buffer.from(expected + '='.repeat((4 - expected.length % 4) % 4), 'base64');
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    // Decode and validate claims
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (!payload.sub) return null;
    if (payload.exp && payload.exp < now) return null;      // expired
    if (payload.nbf && payload.nbf > now + 60) return null; // not yet valid (allow 60s clock skew)
    if (payload.iat && payload.iat > now + 60) return null; // issued in future

    return payload;
  } catch {
    return null;
  }
}

module.exports = { sign, verify };
