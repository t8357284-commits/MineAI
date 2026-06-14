const express = require('express');
const multer = require('multer');
const { body, param, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { requireUser } = require('../middleware/userAuth');
const { requireAdmin } = require('../middleware/adminAuth');
const { publicUser } = require('../utils/db');
const { saveUpload } = require('../utils/storage');
const { recordAuditLog } = require('../utils/audit');
const { sendSubscriptionEmail } = require('../utils/email');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.RECEIPT_MAX_MB || '5', 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype);
    cb(ok ? null : new Error('صيغة السند غير مدعومة. استخدم JPG أو PNG أو WEBP أو PDF'), ok);
  },
});

const planPrices = {
  pro: Number(process.env.PLAN_PRO_PRICE || 0),
  business: Number(process.env.PLAN_BUSINESS_PRICE || 0),
};

router.use(requireUser);

router.get('/my', async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json({ success: true, payments });
  } catch (err) { next(err); }
});

router.post('/submit', upload.single('receipt'), [
  body('plan').isIn(['pro', 'business']),
  body('amount').isFloat({ min: 0 }),
  body('currency').optional().isString().isLength({ min: 2, max: 10 }),
  body('paymentMethod').isString().isLength({ min: 2, max: 50 }),
  body('transactionNumber').optional().isString().isLength({ max: 120 }),
  body('requestedDays').optional().isInt({ min: 1, max: 3650 }),
  body('note').optional().isString().isLength({ max: 500 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    if (!req.file) return res.status(400).json({ error: 'يرجى رفع صورة السند أو ملف PDF' });

    const savedReceipt = await saveUpload(req.file, { folder: 'payment-receipts' });

    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        plan: req.body.plan,
        amount: req.body.amount,
        currency: String(req.body.currency || 'YER').toUpperCase(),
        paymentMethod: String(req.body.paymentMethod || '').trim(),
        transactionNumber: String(req.body.transactionNumber || '').trim(),
        receiptImage: savedReceipt.url,
        receiptProvider: savedReceipt.provider,
        receiptPublicId: savedReceipt.publicId || '',
        requestedDays: parseInt(req.body.requestedDays || '30', 10),
        note: String(req.body.note || '').trim(),
      },
    });

    await recordAuditLog(req, 'PAYMENT_SUBMITTED', 'Payment', payment.id, { plan: payment.plan, amount: String(payment.amount), paymentMethod: payment.paymentMethod });
    res.status(201).json({ success: true, payment });
  } catch (err) { next(err); }
});

router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.query.status || 'PENDING').toUpperCase();
    const where = ['PENDING', 'APPROVED', 'REJECTED'].includes(status) ? { status } : {};
    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { id: true, name: true, email: true, plan: true, planExpiresAt: true } } },
    });
    res.json({ success: true, payments });
  } catch (err) { next(err); }
});

router.post('/admin/:id/approve', requireAdmin, [
  param('id').isString().isLength({ min: 10, max: 80 }),
  body('adminNote').optional().isString().isLength({ max: 500 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) return res.status(404).json({ error: 'طلب الدفع غير موجود' });
    if (payment.status !== 'PENDING') return res.status(400).json({ error: 'هذا الطلب تمت مراجعته مسبقاً' });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + payment.requestedDays * 24 * 60 * 60 * 1000);

    const [updatedPayment, user] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'APPROVED',
          approvedAt: now,
          approvedById: req.user.id,
          adminNote: String(req.body.adminNote || '').trim(),
        },
      }),
      prisma.user.update({
        where: { id: payment.userId },
        data: {
          plan: payment.plan,
          planStartedAt: now,
          planExpiresAt: expiresAt,
          subscriptionStatus: 'payment_approved',
          subscriptionNote: `تم التفعيل بعد قبول سند الدفع رقم ${payment.transactionNumber || payment.id}`,
        },
      }),
    ]);

    await recordAuditLog(req, 'PAYMENT_APPROVED', 'Payment', payment.id, { userId: payment.userId, plan: payment.plan, requestedDays: payment.requestedDays });
    try { await sendSubscriptionEmail(user, { plan: payment.plan, expiresAt, status: 'approved' }); } catch (mailErr) { console.error('Subscription email failed:', mailErr.message); }
    res.json({ success: true, payment: updatedPayment, user: publicUser(user) });
  } catch (err) { next(err); }
});

router.post('/admin/:id/reject', requireAdmin, [
  param('id').isString().isLength({ min: 10, max: 80 }),
  body('adminNote').optional().isString().isLength({ max: 500 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', rejectedAt: new Date(), adminNote: String(req.body.adminNote || 'تم رفض السند').trim() },
    });
    await recordAuditLog(req, 'PAYMENT_REJECTED', 'Payment', payment.id, { adminNote: payment.adminNote });
    res.json({ success: true, payment });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'طلب الدفع غير موجود' });
    next(err);
  }
});

module.exports = router;
