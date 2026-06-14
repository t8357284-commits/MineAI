const prisma = require('../utils/prisma');

const PLAN_LIMITS = {
  free: parseInt(process.env.FREE_DAILY_LIMIT || '10'),
  pro: parseInt(process.env.PRO_DAILY_LIMIT || '100'),
  business: parseInt(process.env.BUSINESS_DAILY_LIMIT || '1000'),
  admin: 999999,
};

function todayKey() { return new Date().toISOString().slice(0, 10); }

async function consumeAiCredit(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام أدوات الذكاء الاصطناعي' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.isActive === false) return res.status(401).json({ error: 'جلسة غير صالحة' });

    const now = new Date();
    const expired = user.plan !== 'free' && user.planExpiresAt && new Date(user.planExpiresAt) < now;
    const plan = expired ? 'free' : (user.plan || 'free');
    const limit = PLAN_LIMITS[user.role === 'admin' ? 'admin' : plan] || PLAN_LIMITS.free;
    const day = todayKey();

    const usage = await prisma.usage.upsert({
      where: { userId_day: { userId: user.id, day } },
      create: { userId: user.id, day, aiRequests: 1 },
      update: { aiRequests: { increment: 1 } },
    });

    if (usage.aiRequests > limit) {
      await prisma.usage.update({
        where: { userId_day: { userId: user.id, day } },
        data: { aiRequests: { decrement: 1 } },
      });
      return res.status(429).json({ error: 'انتهى حد الاستخدام اليومي لهذه الباقة', limit, used: limit, plan });
    }

    req.usage = { limit, used: usage.aiRequests, plan };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { consumeAiCredit, PLAN_LIMITS };
