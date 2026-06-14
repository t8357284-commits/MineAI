const prisma = require('../utils/prisma');
const { verify } = require('../utils/tokens');
const { publicUser } = require('../utils/db');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function requireUser(req, res, next) {
  try {
    const payload = verify(getBearerToken(req));
    if (!payload?.sub) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });

    const user = await prisma.user.findFirst({ where: { id: payload.sub, isActive: true } });
    if (!user) return res.status(401).json({ error: 'جلسة غير صالحة' });
    req.user = publicUser(user);
    next();
  } catch (err) {
    next(err);
  }
}

async function optionalUser(req, _res, next) {
  try {
    const payload = verify(getBearerToken(req));
    if (payload?.sub) {
      const user = await prisma.user.findFirst({ where: { id: payload.sub, isActive: true } });
      if (user) req.user = publicUser(user);
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireUser, optionalUser };
