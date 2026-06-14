function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'صلاحيات المدير مطلوبة' });
  next();
}

module.exports = { requireAdmin };
