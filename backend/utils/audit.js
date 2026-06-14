const prisma = require('./prisma');

function pickRequestInfo(req) {
  return {
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',
    userAgent: req.headers['user-agent'] || '',
  };
}

async function recordAuditLog(req, action, entityType, entityId, metadata = {}) {
  try {
    const info = pickRequestInfo(req || { headers: {} });
    return await prisma.auditLog.create({
      data: {
        actorId: req?.user?.id || null,
        action,
        entityType,
        entityId: entityId || '',
        metadata,
        ip: info.ip,
        userAgent: info.userAgent,
      },
    });
  } catch (err) {
    // Audit logging must never break the main business operation.
    console.error('AuditLog failed:', err.message);
    return null;
  }
}

module.exports = { recordAuditLog };
