const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { requireUser } = require('../middleware/userAuth');
const { saveUpload } = require('../utils/storage');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MEDIA_MAX_MB || '25', 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      'video/mp4', 'video/quicktime'
    ].includes(file.mimetype);
    cb(ok ? null : new Error('صيغة الملف غير مدعومة حالياً'), ok);
  },
});

router.use(requireUser);

router.get('/my', async (req, res, next) => {
  try {
    const assets = await prisma.mediaAsset.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
    res.json({ success: true, assets });
  } catch (err) { next(err); }
});

router.post('/media', upload.single('file'), [
  body('purpose').optional().isString().isLength({ max: 40 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    if (!req.file) return res.status(400).json({ error: 'يرجى اختيار ملف' });

    const saved = await saveUpload(req.file, { folder: 'user-media' });
    const asset = await prisma.mediaAsset.create({
      data: {
        userId: req.user.id,
        originalName: req.file.originalname || 'upload',
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: saved.url,
        provider: saved.provider,
        publicId: saved.publicId || '',
        purpose: String(req.body.purpose || 'general').trim() || 'general',
      },
    });

    res.status(201).json({ success: true, asset });
  } catch (err) { next(err); }
});

module.exports = router;
