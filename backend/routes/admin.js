const express = require('express');
const { body, param, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { requireUser } = require('../middleware/userAuth');
const { requireAdmin } = require('../middleware/adminAuth');
const { publicUser } = require('../utils/db');
const { recordAuditLog } = require('../utils/audit');

const router = express.Router();
router.use(requireUser, requireAdmin);

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

router.get('/overview', async (_req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [users, activeUsers, projects, scripts, todayUsageAgg, planGroups, recentUsers, recentProjects, recentScripts] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.project.count(),
      prisma.script.count(),
      prisma.usage.aggregate({ where: { day: today }, _sum: { aiRequests: true } }),
      prisma.user.groupBy({ by: ['plan'], _count: { plan: true } }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, name: true, email: true, plan: true, planStartedAt: true, planExpiresAt: true, subscriptionStatus: true, subscriptionNote: true, role: true, isActive: true, createdAt: true } }),
      prisma.project.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { user: { select: { name: true, email: true } } } }),
      prisma.script.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { user: { select: { name: true, email: true } } } }),
    ]);

    const plans = planGroups.reduce((acc, row) => {
      acc[row.plan] = row._count.plan;
      return acc;
    }, { free: 0, pro: 0, business: 0 });

    res.json({
      success: true,
      stats: {
        users,
        activeUsers,
        inactiveUsers: users - activeUsers,
        projects,
        scripts,
        aiRequestsToday: todayUsageAgg._sum.aiRequests || 0,
        plans,
      },
      recentUsers,
      recentProjects,
      recentScripts,
    });
  } catch (err) { next(err); }
});

router.get('/users', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const page = Math.max(parseInt(req.query.page || '1'), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '20'), 5), 100);
    const where = q ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    } : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, name: true, email: true, plan: true, planStartedAt: true, planExpiresAt: true, subscriptionStatus: true, subscriptionNote: true, role: true, isActive: true, createdAt: true, updatedAt: true,
          _count: { select: { projects: true, scripts: true } },
        },
      }),
    ]);

    res.json({ success: true, total, page, pageSize, users });
  } catch (err) { next(err); }
});

router.patch('/users/:id', [
  param('id').isString().isLength({ min: 10, max: 80 }),
  body('plan').optional().isIn(['free', 'pro', 'business']),
  body('role').optional().isIn(['admin', 'user']),
  body('isActive').optional().isBoolean(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const data = {};
    if (req.body.plan !== undefined) data.plan = req.body.plan;
    if (req.body.role !== undefined) data.role = req.body.role;
    if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);
    if (!Object.keys(data).length) return res.status(400).json({ error: 'لا توجد بيانات للتحديث' });

    if (req.params.id === req.user.id && data.isActive === false) {
      return res.status(400).json({ error: 'لا يمكنك تعطيل حسابك الحالي' });
    }

    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    await recordAuditLog(req, 'ADMIN_USER_UPDATED', 'User', user.id, { data });
    res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'المستخدم غير موجود' });
    next(err);
  }
});


router.post('/users/:id/subscription', [
  param('id').isString().isLength({ min: 10, max: 80 }),
  body('plan').isIn(['free', 'pro', 'business']),
  body('days').optional().isInt({ min: 0, max: 3650 }),
  body('note').optional().isString().isLength({ max: 500 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const plan = req.body.plan;
    const days = parseInt(req.body.days || '30', 10);
    const now = new Date();
    let planStartedAt = null;
    let planExpiresAt = null;
    let subscriptionStatus = 'inactive';

    if (plan !== 'free') {
      planStartedAt = now;
      planExpiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      subscriptionStatus = 'manual_active';
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        plan,
        planStartedAt,
        planExpiresAt,
        subscriptionStatus,
        subscriptionNote: String(req.body.note || '').trim(),
      },
    });

    await recordAuditLog(req, 'ADMIN_SUBSCRIPTION_ACTIVATED', 'User', user.id, { plan, days, subscriptionStatus });
    res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'المستخدم غير موجود' });
    next(err);
  }
});

router.post('/users/:id/subscription/cancel', [
  param('id').isString().isLength({ min: 10, max: 80 }),
  body('note').optional().isString().isLength({ max: 500 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        plan: 'free',
        planStartedAt: null,
        planExpiresAt: null,
        subscriptionStatus: 'cancelled',
        subscriptionNote: String(req.body.note || 'تم الإلغاء يدوياً من لوحة المدير').trim(),
      },
    });

    await recordAuditLog(req, 'ADMIN_SUBSCRIPTION_CANCELLED', 'User', user.id, { note: req.body.note || '' });
    res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'المستخدم غير موجود' });
    next(err);
  }
});

router.get('/usage', async (req, res, next) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days || '14'), 1), 90);
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    const sinceDay = since.toISOString().slice(0, 10);

    const usage = await prisma.usage.groupBy({
      by: ['day'],
      where: { day: { gte: sinceDay } },
      _sum: { aiRequests: true },
      orderBy: { day: 'asc' },
    });

    res.json({ success: true, usage: usage.map(u => ({ day: u.day, aiRequests: u._sum.aiRequests || 0 })) });
  } catch (err) { next(err); }
});


router.get('/audit-logs', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '50', 10), 10), 100);
    const action = String(req.query.action || '').trim();
    const where = action ? { action } : {};
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      }),
    ]);
    res.json({ success: true, total, page, pageSize, logs });
  } catch (err) { next(err); }
});

module.exports = router;
