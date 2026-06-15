const express = require('express');
const { body, query, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const { requireUser } = require('../middleware/userAuth');
const { saveUpload } = require('../utils/storage');
const { generateSpeech, isProviderConfigured } = require('../utils/ttsProviders');
const { listVoices, findVoice, PROVIDERS, LANGUAGES, GENDERS } = require('../config/voices');

const router = express.Router();

router.use(requireUser);

// ─── GET /api/voice/voices ─────────────────────────────────
// Returns the catalog of available voices, optionally filtered by
// provider / language / gender — used to populate the voice selector.
router.get('/voices', [
  query('provider').optional().isIn(PROVIDERS),
  query('language').optional().isIn(LANGUAGES),
  query('gender').optional().isIn(GENDERS),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { provider, language, gender } = req.query;
    const voices = listVoices({ provider, language, gender });

    res.json({
      success: true,
      voices,
      providers: PROVIDERS.map(p => ({ id: p, configured: isProviderConfigured(p) })),
    });
  } catch (err) { next(err); }
});

// ─── GET /api/voice/history ────────────────────────────────
router.get('/history', [
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'processing', 'completed', 'failed']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const page = parseInt(req.query.page || '1', 10);
    const pageSize = Math.min(parseInt(req.query.pageSize || '20', 10), 100);
    const where = {
      userId: req.user.id,
      ...(req.query.status ? { status: req.query.status } : {}),
    };

    const [jobs, total] = await Promise.all([
      prisma.voiceJob.findMany({
        where,
        include: { audio: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.voiceJob.count({ where }),
    ]);

    res.json({
      success: true,
      jobs,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (err) { next(err); }
});

// ─── GET /api/voice/:id ─────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const job = await prisma.voiceJob.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { audio: true },
    });
    if (!job) return res.status(404).json({ error: 'مهمة التحويل الصوتي غير موجودة' });
    res.json({ success: true, job });
  } catch (err) { next(err); }
});

// ─── POST /api/voice/generate ──────────────────────────────
router.post('/generate', [
  body('text').isString().trim().isLength({ min: 1, max: 5000 }).withMessage('النص يجب أن يكون بين 1 و5000 حرف'),
  body('provider').isIn(PROVIDERS).withMessage('المزود غير مدعوم'),
  body('language').isIn(LANGUAGES).withMessage('اللغة غير مدعومة'),
  body('gender').isIn(GENDERS).withMessage('الجنس غير مدعوم'),
  body('voiceId').optional().isString().trim().isLength({ min: 1, max: 300 }),
  body('voiceName').optional().isString().trim().isLength({ max: 150 }),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  let job = null;

  try {
    const { text, provider, language, gender } = req.body;

    if (!isProviderConfigured(provider)) {
      return res.status(503).json({ error: `مزود الصوت (${provider}) غير مهيأ على الخادم` });
    }

    // Resolve the voice: prefer an explicit voiceId, otherwise pick the
    // first catalog voice matching language + gender for this provider.
    let voiceId = req.body.voiceId;
    let voiceName = req.body.voiceName || '';

    if (!voiceId) {
      const candidates = listVoices({ provider, language, gender });
      if (!candidates.length) {
        return res.status(422).json({ error: 'لا توجد أصوات متاحة لهذا الاختيار' });
      }
      voiceId = candidates[0].voiceId;
      voiceName = candidates[0].name;
    } else if (!voiceName) {
      const found = findVoice(provider, voiceId);
      voiceName = found?.name || '';
    }

    // Create the job record up-front so history shows in-progress jobs.
    job = await prisma.voiceJob.create({
      data: {
        userId: req.user.id,
        provider,
        voiceId,
        voiceName,
        language,
        gender,
        text,
        status: 'processing',
        startedAt: new Date(),
      },
    });

    const audioBuffer = await generateSpeech(provider, { text, voiceId, language });

    const saved = await saveUpload(
      {
        buffer: audioBuffer,
        originalname: `voice-${job.id}.mp3`,
        mimetype: 'audio/mpeg',
        size: audioBuffer.length,
      },
      { folder: 'voice-overs' }
    );

    const audio = await prisma.generatedAudio.create({
      data: {
        userId: req.user.id,
        voiceJobId: job.id,
        provider,
        voiceId,
        voiceName,
        language,
        gender,
        text,
        url: saved.url,
        storageProvider: saved.provider,
        publicId: saved.publicId || '',
        format: 'mp3',
        size: audioBuffer.length,
      },
    });

    job = await prisma.voiceJob.update({
      where: { id: job.id },
      data: { status: 'completed', completedAt: new Date() },
      include: { audio: true },
    });

    res.status(201).json({ success: true, job, audio });
  } catch (err) {
    logger.error(`Voice generation failed: ${err.message}`);

    if (job) {
      try {
        job = await prisma.voiceJob.update({
          where: { id: job.id },
          data: { status: 'failed', errorMessage: String(err.message || 'فشل التوليد').slice(0, 500), completedAt: new Date() },
        });
      } catch (updateErr) {
        logger.error(`Failed to mark voice job as failed: ${updateErr.message}`);
      }
      return res.status(502).json({ error: 'فشل توليد الصوت، حاول مرة أخرى', job });
    }

    next(err);
  }
});

// ─── DELETE /api/voice/:id ──────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const job = await prisma.voiceJob.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!job) return res.status(404).json({ error: 'مهمة التحويل الصوتي غير موجودة' });
    await prisma.voiceJob.delete({ where: { id: job.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
