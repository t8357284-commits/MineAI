/**
 * Voice Over Studio — API Routes
 *
 * Hybrid provider system:
 *  FREE users  → Edge TTS (Microsoft Neural, zero cost)
 *  PRO users   → ElevenLabs (premium quality)
 *  Fallback    → Edge TTS when ElevenLabs fails
 *
 * Existing routes are fully preserved and backward-compatible.
 * New routes are additive.
 */
'use strict';

const express    = require('express');
const { body, query, validationResult } = require('express-validator');
const crypto     = require('crypto');
const prisma     = require('../utils/prisma');
const logger     = require('../utils/logger');
const { requireUser } = require('../middleware/userAuth');
const { saveUpload }  = require('../utils/storage');
const factory    = require('../utils/voiceProviderFactory');

const router = express.Router();
router.use(requireUser);

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const LANGUAGES     = ['ar', 'en'];
const GENDERS       = ['male', 'female'];
const ALL_PROVIDERS = ['elevenlabs', 'edge_tts', 'playht'];

function contentHash(provider, voiceId, text) {
  return crypto.createHash('sha256').update(`${provider}::${voiceId}::${text}`).digest('hex');
}

// ─────────────────────────────────────────────────────────────
// GET /api/voice/voices  — Phase 5 catalog endpoint
// ─────────────────────────────────────────────────────────────
router.get('/voices', [
  query('language').optional().isIn(LANGUAGES),
  query('gender').optional().isIn(GENDERS),
  query('provider').optional().isIn(ALL_PROVIDERS),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { language, gender } = req.query;
    const { freeVoices, premiumVoices } = factory.getVoiceCatalog({ language, gender });

    const plan      = req.user.plan;
    const isPremium = plan === 'pro' || plan === 'business';
    const userVoices = factory.listVoicesForPlan(plan, { language, gender });

    res.json({
      success       : true,
      freeVoices,
      premiumVoices,
      voices        : userVoices,   // legacy flat list
      providers: [
        { id: 'edge_tts',   name: 'Edge TTS (Microsoft)', tier: 'free',    configured: factory.isProviderConfigured('edge_tts'),   enabled: process.env.EDGE_TTS_ENABLED !== 'false' },
        { id: 'elevenlabs', name: 'ElevenLabs',           tier: 'premium', configured: factory.isProviderConfigured('elevenlabs'), enabled: process.env.ELEVENLABS_ENABLED !== 'false' },
      ],
      userPlan  : plan,
      isPremium,
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// GET /api/voice/history
// ─────────────────────────────────────────────────────────────
router.get('/history', [
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'processing', 'completed', 'failed']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const page     = parseInt(req.query.page     || '1',  10);
    const pageSize = Math.min(parseInt(req.query.pageSize || '20', 10), 100);
    const where    = {
      userId : req.user.id,
      ...(req.query.status ? { status: req.query.status } : {}),
    };

    const [jobs, total] = await Promise.all([
      prisma.voiceJob.findMany({
        where, include: { audio: true }, orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.voiceJob.count({ where }),
    ]);

    res.json({
      success    : true,
      jobs,
      pagination : { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// GET /api/voice/:id
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const job = await prisma.voiceJob.findFirst({
      where: { id: req.params.id, userId: req.user.id }, include: { audio: true },
    });
    if (!job) return res.status(404).json({ error: 'مهمة التحويل الصوتي غير موجودة' });
    res.json({ success: true, job });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// POST /api/voice/generate — Hybrid generation
// ─────────────────────────────────────────────────────────────
router.post('/generate', [
  body('text').isString().trim().isLength({ min: 1, max: 5000 }).withMessage('النص يجب أن يكون بين 1 و5000 حرف'),
  body('language').isIn(LANGUAGES).withMessage('اللغة غير مدعومة'),
  body('gender').optional().isIn(GENDERS),
  body('voiceId').optional().isString().trim().isLength({ min: 1, max: 300 }),
  body('voiceName').optional().isString().trim().isLength({ max: 150 }),
  body('provider').optional().isIn(ALL_PROVIDERS),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  let job = null;
  const startTime = Date.now();

  try {
    const { text, language } = req.body;
    const user      = req.user;
    const plan      = user.plan;
    const isPremium = plan === 'pro' || plan === 'business';
    const g         = req.body.gender || 'male';

    // 1. Resolve provider
    let resolvedProvider;
    const requestedProvider = req.body.provider;
    if (requestedProvider === 'edge_tts') {
      resolvedProvider = 'edge_tts'; // always allowed
    } else if (requestedProvider === 'elevenlabs' && isPremium) {
      resolvedProvider = 'elevenlabs';
    } else {
      resolvedProvider = factory.resolveProviderForPlan(plan);
    }

    // Gate premium providers
    if (resolvedProvider === 'elevenlabs' && !isPremium) {
      return res.status(403).json({
        error: 'مزود ElevenLabs متاح فقط للمستخدمين المميزين', upgradeRequired: true,
      });
    }

    // 2. Resolve voice
    let voiceId   = req.body.voiceId;
    let voiceName = req.body.voiceName || '';

    if (!voiceId) {
      const { freeVoices, premiumVoices } = factory.getVoiceCatalog({ language, gender: g });
      const pool = resolvedProvider === 'elevenlabs' ? premiumVoices : freeVoices;
      if (!pool.length) return res.status(422).json({ error: 'لا توجد أصوات متاحة لهذا الاختيار' });
      voiceId   = pool[0].voiceId;
      voiceName = pool[0].name;
    } else if (!voiceName) {
      const found = factory.findVoice(resolvedProvider, voiceId);
      voiceName = found?.name || '';
    }

    // 3. DB dedup — avoid re-generating identical content
    const hash = contentHash(resolvedProvider, voiceId, text);
    const existing = await prisma.generatedAudio.findFirst({
      where: { userId: user.id, contentHash: hash },
      include: { voiceJob: true },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      logger.info(`Voice dedup HIT userId=${user.id} hash=${hash.slice(0, 12)}`);
      return res.status(200).json({
        success: true, fromCache: true, job: existing.voiceJob, audio: existing,
      });
    }

    // 4. Create job
    job = await prisma.voiceJob.create({
      data: {
        userId: user.id, provider: resolvedProvider, voiceId, voiceName,
        language, gender: g, text, status: 'processing', startedAt: new Date(),
      },
    });

    // 5. Generate audio (with automatic ElevenLabs→EdgeTTS fallback inside factory)
    const { buffer, provider: usedProvider, voiceId: usedVoiceId, fromCache } =
      await factory.generateSpeechForUser(user, { text, voiceId, language, provider: resolvedProvider });

    const processingTime = Date.now() - startTime;
    const fallbackUsed   = usedProvider !== resolvedProvider;

    // 6. Save file
    const saved = await saveUpload(
      { buffer, originalname: `voice-${job.id}.mp3`, mimetype: 'audio/mpeg', size: buffer.length },
      { folder: 'voice-overs' }
    );

    // 7. Persist audio record
    const audio = await prisma.generatedAudio.create({
      data: {
        userId: user.id, voiceJobId: job.id,
        provider: usedProvider, voiceId: usedVoiceId, voiceName, language, gender: g,
        text, contentHash: hash, url: saved.url, storageProvider: saved.provider,
        publicId: saved.publicId || '', format: 'mp3',
        size: buffer.length, sizeBytes: buffer.length, fromCache,
      },
    });

    // 8. Mark job complete
    job = await prisma.voiceJob.update({
      where: { id: job.id },
      data: {
        status: 'completed', completedAt: new Date(),
        provider: usedProvider, processingTime, fallbackUsed,
      },
      include: { audio: true },
    });

    res.status(201).json({
      success: true, fromCache, fallbackUsed, usedProvider,
      processingMs: processingTime, job, audio,
    });
  } catch (err) {
    logger.error(`Voice generation failed: ${err.message}`);
    if (job) {
      try {
        await prisma.voiceJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            errorMessage: String(err.message || 'فشل التوليد').slice(0, 500),
            completedAt: new Date(),
            processingTime: Date.now() - startTime,
          },
        });
      } catch (e) { logger.error(`Failed to update failed job: ${e.message}`); }
      return res.status(502).json({ error: 'فشل توليد الصوت، حاول مرة أخرى', job });
    }
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/voice/:id
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const job = await prisma.voiceJob.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!job) return res.status(404).json({ error: 'مهمة التحويل الصوتي غير موجودة' });
    await prisma.voiceJob.delete({ where: { id: job.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
