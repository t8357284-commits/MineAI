const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { hashPassword, verifyPassword, publicUser } = require('../utils/db');
const { sign } = require('../utils/tokens');
const { requireUser } = require('../middleware/userAuth');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../utils/email');
const { recordAuditLog } = require('../utils/audit');

const router = express.Router();

function makeToken(user) {
  return sign({ sub: user.id, email: user.email });
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createEmailVerification(user, req) {
  const token = randomToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  await sendVerificationEmail(user, token);
  await recordAuditLog(req, 'EMAIL_VERIFICATION_SENT', 'User', user.id, { email: user.email });
  return token;
}

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', [
  body('name').isString().trim().isLength({ min: 2, max: 80 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8, max: 100 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const email = req.body.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'البريد مسجل مسبقاً' });

    // bcrypt is async — await it
    const passwordHash = await hashPassword(req.body.password);

    const userCount = await prisma.user.count();
    const user = await prisma.user.create({
      data: {
        name: req.body.name.trim(),
        email,
        passwordHash,
        plan: 'free',
        role: userCount === 0 ? 'admin' : 'user',
        isActive: true,
      },
    });

    try { await createEmailVerification(user, req); } catch (mailErr) { console.error('Verification email failed:', mailErr.message); }
    await recordAuditLog(req, 'USER_REGISTERED', 'User', user.id, { email: user.email, role: user.role });

    res.status(201).json({
      success: true,
      token: makeToken(user),
      user: publicUser(user),
      message: 'تم إنشاء الحساب. تحقق من بريدك لتفعيل البريد الإلكتروني.',
    });
  } catch (err) { next(err); }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1, max: 100 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const user = await prisma.user.findUnique({ where: { email: req.body.email.toLowerCase() } });

    // Always run verifyPassword even if user not found (prevent timing oracle)
    const passwordOk = user
      ? await verifyPassword(req.body.password, user.passwordHash)
      : await verifyPassword(req.body.password, '$2b$12$invalidhashpadding000000000000000000000000000000000000000');

    if (!user || !passwordOk || user.isActive === false) {
      await recordAuditLog(req, 'LOGIN_FAILED', 'User', user?.id || '', { email: req.body.email.toLowerCase() });
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    await recordAuditLog({ ...req, user }, 'LOGIN_SUCCESS', 'User', user.id, { email: user.email });
    res.json({ success: true, token: makeToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
});

// ── Me ────────────────────────────────────────────────────────────────────────
router.get('/me', requireUser, async (req, res, next) => {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const usage = await prisma.usage.findUnique({ where: { userId_day: { userId: req.user.id, day } } }) || { aiRequests: 0, day };
    res.json({ success: true, user: publicUser(req.user), usage });
  } catch (err) { next(err); }
});

// ── Forgot Password ───────────────────────────────────────────────────────────
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const email = req.body.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.isActive) {
      const token = randomToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await sendPasswordResetEmail(user, token);
      await recordAuditLog(req, 'PASSWORD_RESET_REQUESTED', 'User', user.id, { email });
    }

    // Always return the same response (prevent email enumeration)
    res.json({ success: true, message: 'إذا كان البريد مسجلاً، سيصلك رابط استعادة كلمة المرور.' });
  } catch (err) { next(err); }
});

// ── Reset Password ────────────────────────────────────────────────────────────
router.post('/reset-password', [
  body('token').isString().isLength({ min: 32, max: 200 }),
  body('password').isString().isLength({ min: 8, max: 100 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const reset = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: tokenHash(req.body.token) },
      include: { user: true },
    });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      return res.status(400).json({ error: 'رابط الاستعادة غير صالح أو انتهت صلاحيته' });
    }

    const newHash = await hashPassword(req.body.password);

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: reset.userId },
        data: { passwordHash: newHash },
      });
      await tx.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
      // Invalidate all other reset tokens for this user
      await tx.passwordResetToken.updateMany({ where: { userId: reset.userId, usedAt: null }, data: { usedAt: new Date() } });
      return updated;
    });

    await recordAuditLog({ ...req, user }, 'PASSWORD_RESET_COMPLETED', 'User', user.id, { email: user.email });
    res.json({ success: true, token: makeToken(user), user: publicUser(user), message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) { next(err); }
});

// ── Resend Verification ───────────────────────────────────────────────────────
router.post('/resend-verification', requireUser, async (req, res, next) => {
  try {
    if (req.user.emailVerified) return res.json({ success: true, message: 'البريد مفعل مسبقاً' });
    await createEmailVerification(req.user, req);
    res.json({ success: true, message: 'تم إرسال رابط التفعيل إلى بريدك' });
  } catch (err) { next(err); }
});

// ── Verify Email ──────────────────────────────────────────────────────────────
router.post('/verify-email', [
  body('token').isString().isLength({ min: 32, max: 200 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const verification = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: tokenHash(req.body.token) },
      include: { user: true },
    });
    if (!verification || verification.usedAt || verification.expiresAt < new Date()) {
      return res.status(400).json({ error: 'رابط التفعيل غير صالح أو انتهت صلاحيته' });
    }

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: verification.userId }, data: { emailVerified: true } });
      await tx.emailVerificationToken.update({ where: { id: verification.id }, data: { usedAt: new Date() } });
      await tx.emailVerificationToken.updateMany({ where: { userId: verification.userId, usedAt: null }, data: { usedAt: new Date() } });
      return updated;
    });

    await recordAuditLog({ ...req, user }, 'EMAIL_VERIFIED', 'User', user.id, { email: user.email });
    res.json({ success: true, token: makeToken(user), user: publicUser(user), message: 'تم تفعيل البريد الإلكتروني' });
  } catch (err) { next(err); }
});

module.exports = router;
