const nodemailer = require('nodemailer');
const logger = require('./logger');

function getBaseUrl() {
  return (process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function isEmailEnabled() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);
}

function makeTransport() {
  if (!isEmailEnabled()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendMail({ to, subject, html, text }) {
  const transport = makeTransport();
  if (!transport) {
    logger.warn(`[email-disabled] ${subject} -> ${to}`);
    if (process.env.NODE_ENV !== 'production') logger.info(text || html);
    return { skipped: true };
  }
  return transport.sendMail({ from: process.env.MAIL_FROM, to, subject, html, text });
}

async function sendPasswordResetEmail(user, token) {
  const url = `${getBaseUrl()}/?resetToken=${encodeURIComponent(token)}`;
  return sendMail({
    to: user.email,
    subject: 'استعادة كلمة المرور - SocialPulse AI',
    text: `مرحباً ${user.name}\n\nاستخدم الرابط التالي لإعادة تعيين كلمة المرور خلال ساعة واحدة:\n${url}\n\nإذا لم تطلب ذلك، تجاهل الرسالة.`,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>استعادة كلمة المرور</h2><p>مرحباً ${user.name}</p><p>اضغط الزر التالي لإعادة تعيين كلمة المرور خلال ساعة واحدة:</p><p><a href="${url}" style="background:#FF0050;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">إعادة تعيين كلمة المرور</a></p><p style="color:#64748b">إذا لم تطلب ذلك، تجاهل الرسالة.</p></div>`,
  });
}

async function sendVerificationEmail(user, token) {
  const url = `${getBaseUrl()}/?verifyToken=${encodeURIComponent(token)}`;
  return sendMail({
    to: user.email,
    subject: 'تفعيل البريد الإلكتروني - SocialPulse AI',
    text: `مرحباً ${user.name}\n\nفعّل بريدك من الرابط التالي:\n${url}`,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>تفعيل البريد الإلكتروني</h2><p>مرحباً ${user.name}</p><p>اضغط الزر التالي لتفعيل بريدك:</p><p><a href="${url}" style="background:#00A3FF;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">تفعيل البريد</a></p></div>`,
  });
}

async function sendSubscriptionEmail(user, { plan, expiresAt, status }) {
  return sendMail({
    to: user.email,
    subject: status === 'approved' ? 'تم تفعيل اشتراكك - SocialPulse AI' : 'تحديث طلب الدفع - SocialPulse AI',
    text: status === 'approved'
      ? `تم تفعيل باقة ${plan} حتى ${expiresAt ? new Date(expiresAt).toLocaleDateString('ar') : '-'}.`
      : `تم تحديث حالة طلب الدفع الخاص بك.` ,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>${status === 'approved' ? 'تم تفعيل الاشتراك' : 'تحديث طلب الدفع'}</h2><p>الباقة: <b>${plan}</b></p><p>تاريخ الانتهاء: ${expiresAt ? new Date(expiresAt).toLocaleDateString('ar') : '-'}</p></div>`,
  });
}

module.exports = { sendMail, sendPasswordResetEmail, sendVerificationEmail, sendSubscriptionEmail, isEmailEnabled };
