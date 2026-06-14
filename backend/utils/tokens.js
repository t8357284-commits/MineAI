const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload, secret = process.env.JWT_SECRET || process.env.API_SECRET_KEY) {
  if (!secret) throw new Error('JWT_SECRET or API_SECRET_KEY is required');
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: Math.floor(Date.now() / 1000) };
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(body))}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verify(token, secret = process.env.JWT_SECRET || process.env.API_SECRET_KEY) {
  if (!secret || !token || !token.includes('.')) return null;
  const [h, p, s] = token.split('.');
  const data = `${h}.${p}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

module.exports = { sign, verify };
