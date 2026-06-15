/**
 * Voice Provider Factory
 *
 * Routing rules:
 *  • user.plan === 'free'                 → Edge TTS (zero cost)
 *  • user.plan === 'pro'|'business'       → ElevenLabs (premium quality)
 *  • ElevenLabs fails                     → automatic fallback to Edge TTS
 *  • Admin can disable either provider    → EDGE_TTS_ENABLED / ELEVENLABS_ENABLED
 */
'use strict';

const edgeTTS    = require('./providers/edgeTTS');
const elevenlabs = require('./providers/elevenlabs');
const NodeCache  = require('node-cache');
const crypto     = require('crypto');
const logger     = require('./logger');

// ─── Audio cache (text+voice+provider hash → Buffer) ─────────
// Keeps generated buffers in memory for 1 hour to avoid re-generating
// identical requests (Phase 9 — performance).
const audioCache = new NodeCache({ stdTTL: 3600, checkperiod: 300, useClones: false });

function cacheKey(provider, voiceId, text) {
  return crypto
    .createHash('sha256')
    .update(`${provider}::${voiceId}::${text}`)
    .digest('hex');
}

// ─── Provider resolution ──────────────────────────────────────
/**
 * Determine which provider to use for a given user plan.
 * Returns 'elevenlabs' | 'edge_tts'
 */
function resolveProviderForPlan(plan) {
  const isPremium = plan === 'pro' || plan === 'business';
  if (isPremium && elevenlabs.isConfigured()) return 'elevenlabs';
  return 'edge_tts';
}

/**
 * Check whether a given provider is currently available.
 * @param {'elevenlabs'|'edge_tts'|'playht'} provider
 * @returns {Promise<boolean>}
 */
async function isProviderAvailable(provider) {
  if (provider === 'elevenlabs') return elevenlabs.isConfigured();
  if (provider === 'edge_tts')   return edgeTTS.isConfigured();
  return false;
}

// Legacy shim for old code that checked isProviderConfigured(provider)
function isProviderConfigured(provider) {
  if (provider === 'elevenlabs') return elevenlabs.isConfigured();
  if (provider === 'edge_tts')   return edgeTTS.isConfiguredSync();
  if (provider === 'playht')     return Boolean(process.env.PLAYHT_API_KEY && process.env.PLAYHT_USER_ID);
  return false;
}

// ─── List voices (unified catalog) ───────────────────────────
/**
 * Return { freeVoices, premiumVoices } for the /api/voice/voices endpoint.
 */
function getVoiceCatalog({ language, gender } = {}) {
  const freeVoices    = edgeTTS.listVoices({ language, gender });
  const premiumVoices = elevenlabs.listVoices({ language, gender });
  return { freeVoices, premiumVoices };
}

/**
 * List voices accessible to a specific user plan.
 */
function listVoicesForPlan(plan, { language, gender } = {}) {
  const isPremium = plan === 'pro' || plan === 'business';
  if (isPremium) {
    return [...edgeTTS.listVoices({ language, gender }), ...elevenlabs.listVoices({ language, gender })];
  }
  return edgeTTS.listVoices({ language, gender });
}

/**
 * Find a voice entry by voiceId across all providers.
 */
function findVoice(provider, voiceId) {
  if (provider === 'elevenlabs') return elevenlabs.findVoice(voiceId);
  if (provider === 'edge_tts')   return edgeTTS.findVoice(voiceId);
  return null;
}

// ─── Main generation entry-point ──────────────────────────────
/**
 * Generate speech audio for a user.
 *
 * The factory:
 *  1. Checks the cache — returns cached buffer immediately if hit.
 *  2. Selects provider based on user plan (or explicit provider override).
 *  3. If ElevenLabs fails, falls back to Edge TTS automatically.
 *  4. Stores result in cache.
 *
 * @param {object} user          Prisma User row (needs .plan)
 * @param {object} opts
 * @param {string} opts.text
 * @param {string} opts.voiceId
 * @param {string} [opts.language]
 * @param {string} [opts.provider]  Optional explicit override (admin use)
 * @returns {Promise<{ buffer: Buffer, provider: string, voiceId: string, fromCache: boolean }>}
 */
async function generateSpeechForUser(user, { text, voiceId, language, provider: forceProvider } = {}) {
  // 1. Determine provider
  let chosenProvider = forceProvider || resolveProviderForPlan(user.plan);

  // 2. Cache check
  const key = cacheKey(chosenProvider, voiceId, text);
  const cached = audioCache.get(key);
  if (cached) {
    logger.info(`Voice cache HIT  provider=${chosenProvider} voiceId=${voiceId} len=${text.length}`);
    return { buffer: cached, provider: chosenProvider, voiceId, fromCache: true };
  }

  // 3. Generate
  let buffer;
  let usedProvider = chosenProvider;

  try {
    if (chosenProvider === 'elevenlabs') {
      buffer = await elevenlabs.generateAudio({ text, voiceId, language });
    } else {
      buffer = await edgeTTS.generateAudio({ text, voiceId, language });
    }
  } catch (primaryErr) {
    // 4. Automatic fallback
    if (chosenProvider === 'elevenlabs') {
      logger.warn(`ElevenLabs failed (${primaryErr.message}), falling back to Edge TTS`);
      try {
        // Pick a sensible Edge TTS default voice for the language
        const fallbackVoice = pickFallbackEdgeVoice(voiceId, language);
        buffer = await edgeTTS.generateAudio({ text, voiceId: fallbackVoice, language });
        usedProvider = 'edge_tts';
        voiceId      = fallbackVoice;
      } catch (fallbackErr) {
        logger.error(`Edge TTS fallback also failed: ${fallbackErr.message}`);
        throw primaryErr; // throw the original error
      }
    } else {
      throw primaryErr;
    }
  }

  // 5. Store in cache
  audioCache.set(cacheKey(usedProvider, voiceId, text), buffer);

  logger.info(`Voice generated  provider=${usedProvider} voiceId=${voiceId} bytes=${buffer.length} plan=${user.plan}`);
  return { buffer, provider: usedProvider, voiceId, fromCache: false };
}

// ─── Helpers ─────────────────────────────────────────────────
/**
 * When ElevenLabs fails, pick the best Edge TTS voice for the same language.
 * Attempts to guess language from the ElevenLabs voiceId's usage context.
 */
function pickFallbackEdgeVoice(originalVoiceId, language) {
  const lang = language || 'en';
  const defaults = {
    ar: { male: 'ar-SA-HamedNeural',  female: 'ar-SA-ZariyahNeural' },
    en: { male: 'en-US-GuyNeural',    female: 'en-US-AriaNeural'    },
  };
  return defaults[lang]?.male || 'en-US-GuyNeural';
}

/** Cache statistics — exposed to admin endpoint */
function getCacheStats() {
  return {
    keys  : audioCache.keys().length,
    hits  : audioCache.getStats().hits,
    misses: audioCache.getStats().misses,
    ksize : audioCache.getStats().ksize,
    vsize : audioCache.getStats().vsize,
  };
}

/** Flush the audio cache (admin action) */
function clearCache() {
  audioCache.flushAll();
}

module.exports = {
  resolveProviderForPlan,
  isProviderAvailable,
  isProviderConfigured,          // legacy shim
  getVoiceCatalog,
  listVoicesForPlan,
  findVoice,
  generateSpeechForUser,
  getCacheStats,
  clearCache,
};
