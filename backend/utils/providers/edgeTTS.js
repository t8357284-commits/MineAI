/**
 * Edge TTS Provider  (Microsoft Azure Neural Voices — zero API cost)
 * Used for FREE-tier users.
 *
 * Depends on the `edge-tts` Python package:
 *   pip install edge-tts
 * or
 *   npm install edge-tts   (if using the Node.js wrapper)
 *
 * This module shells out to the `edge-tts` CLI which writes MP3 to stdout.
 * No API key required — uses the same back-end as Microsoft Edge browser.
 */
'use strict';

const { execFile, spawn } = require('child_process');
const { promisify }       = require('util');
const os                  = require('os');
const path                = require('path');
const fs                  = require('fs');
const logger              = require('../logger');

const execFileAsync = promisify(execFile);

// ─── Capability check ────────────────────────────────────────
let _available = null; // cached after first check

async function isConfigured() {
  if (process.env.EDGE_TTS_ENABLED === 'false') return false;
  if (_available !== null) return _available;

  try {
    // Prefer the Python edge-tts CLI
    await execFileAsync('edge-tts', ['--version'], { timeout: 8_000 });
    _available = true;
  } catch {
    try {
      // Fallback: python -m edge_tts
      await execFileAsync('python3', ['-m', 'edge_tts', '--help'], { timeout: 8_000 });
      _available = true;
    } catch {
      logger.warn('edge-tts not found — install it: pip install edge-tts');
      _available = false;
    }
  }
  return _available;
}

// Sync version for non-async callers (uses cached value or defaults true)
function isConfiguredSync() {
  if (process.env.EDGE_TTS_ENABLED === 'false') return false;
  return _available !== false; // optimistic until proven otherwise
}

// ─── Voice catalog ────────────────────────────────────────────
// Official Microsoft Neural voice names for Edge TTS.
// Full list: https://speech.microsoft.com/portal/voicegallery
const VOICES = {
  ar: {
    male: [
      { id: 'ar-SA-HamedNeural',  name: 'حامد — السعودية (ذكر)',   locale: 'ar-SA' },
      { id: 'ar-EG-ShakirNeural', name: 'شاكر — مصر (ذكر)',        locale: 'ar-EG' },
      { id: 'ar-AE-HamdanNeural', name: 'حمدان — الإمارات (ذكر)',  locale: 'ar-AE' },
      { id: 'ar-KW-FahedNeural',  name: 'فهد — الكويت (ذكر)',      locale: 'ar-KW' },
    ],
    female: [
      { id: 'ar-SA-ZariyahNeural',  name: 'زارية — السعودية (أنثى)',  locale: 'ar-SA' },
      { id: 'ar-EG-SalmaNeural',    name: 'سلمى — مصر (أنثى)',       locale: 'ar-EG' },
      { id: 'ar-AE-FatimaNeural',   name: 'فاطمة — الإمارات (أنثى)', locale: 'ar-AE' },
      { id: 'ar-KW-NouraNeural',    name: 'نورة — الكويت (أنثى)',    locale: 'ar-KW' },
    ],
  },
  en: {
    male: [
      { id: 'en-US-GuyNeural',        name: 'Guy — US (Male)',          locale: 'en-US' },
      { id: 'en-US-ChristopherNeural',name: 'Christopher — US (Male)',  locale: 'en-US' },
      { id: 'en-GB-RyanNeural',       name: 'Ryan — UK (Male)',         locale: 'en-GB' },
      { id: 'en-AU-WilliamNeural',    name: 'William — AU (Male)',      locale: 'en-AU' },
    ],
    female: [
      { id: 'en-US-AriaNeural',   name: 'Aria — US (Female)',    locale: 'en-US' },
      { id: 'en-US-JennyNeural',  name: 'Jenny — US (Female)',   locale: 'en-US' },
      { id: 'en-GB-SoniaNeural',  name: 'Sonia — UK (Female)',   locale: 'en-GB' },
      { id: 'en-AU-NatashaNeural',name: 'Natasha — AU (Female)', locale: 'en-AU' },
    ],
  },
};

function listVoices({ language, gender } = {}) {
  const langs   = language ? [language] : ['ar', 'en'];
  const genders = gender   ? [gender]   : ['male', 'female'];
  const result  = [];
  for (const lang of langs) {
    for (const g of genders) {
      for (const v of (VOICES[lang]?.[g] || [])) {
        result.push({
          provider : 'edge_tts',
          tier     : 'free',
          language : lang,
          gender   : g,
          voiceId  : v.id,
          name     : v.name,
          locale   : v.locale,
          preview  : null,
        });
      }
    }
  }
  return result;
}

function findVoice(voiceId) {
  for (const lang of ['ar', 'en']) {
    for (const g of ['male', 'female']) {
      const match = (VOICES[lang]?.[g] || []).find(v => v.id === voiceId);
      if (match) return { provider: 'edge_tts', tier: 'free', language: lang, gender: g, voiceId: match.id, name: match.name };
    }
  }
  return null;
}

// ─── Audio generation ─────────────────────────────────────────
/**
 * Generate MP3 audio buffer using edge-tts CLI.
 * Writes to a temp file then reads back to avoid piping large buffers.
 *
 * @param {{ text: string, voiceId: string, language?: string, rate?: string, volume?: string }} opts
 * @returns {Promise<Buffer>}
 */
async function generateAudio({ text, voiceId, language, rate = '+0%', volume = '+0%' }) {
  const available = await isConfigured();
  if (!available) throw new Error('edge-tts is not installed on this server');

  // Validate voice ID falls in our catalog (security: prevent shell injection)
  const allVoices = listVoices();
  if (!allVoices.find(v => v.voiceId === voiceId)) {
    // Still allow it — Microsoft has hundreds of voices; catalog is not exhaustive
    // But sanitise the value strictly
    if (!/^[a-zA-Z]{2}-[A-Z]{2}-[a-zA-Z]+$/.test(voiceId)) {
      throw new Error(`Invalid voice ID format: ${voiceId}`);
    }
  }

  const tmpFile = path.join(os.tmpdir(), `edge-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);

  try {
    // Build CLI args — never interpolate text into shell string; pass as arg array
    const args = [
      '--voice',  voiceId,
      '--rate',   rate,
      '--volume', volume,
      '--text',   text,
      '--write-media', tmpFile,
    ];

    // Try `edge-tts` first, fall back to `python3 -m edge_tts`
    try {
      await execFileAsync('edge-tts', args, { timeout: 60_000, maxBuffer: 64 * 1024 * 1024 });
    } catch (primaryErr) {
      if (primaryErr.code === 'ENOENT') {
        await execFileAsync('python3', ['-m', 'edge_tts', ...args], { timeout: 60_000, maxBuffer: 64 * 1024 * 1024 });
      } else {
        throw primaryErr;
      }
    }

    const buffer = fs.readFileSync(tmpFile);
    return buffer;
  } catch (err) {
    logger.error(`Edge TTS generation error: ${err.message}`);
    throw new Error(`Edge TTS failed: ${err.message}`);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

/**
 * Streaming version — pipes edge-tts stdout directly to an HTTP response.
 * Usage: await streamAudio({ text, voiceId, res });
 */
function streamAudio({ text, voiceId, rate = '+0%', volume = '+0%', res }) {
  return new Promise((resolve, reject) => {
    const args = ['--voice', voiceId, '--rate', rate, '--volume', volume, '--text', text, '--write-media', '-'];
    const proc = spawn('edge-tts', args);

    res.setHeader('Content-Type', 'audio/mpeg');
    proc.stdout.pipe(res);

    proc.on('error', err => {
      // Try python fallback
      const proc2 = spawn('python3', ['-m', 'edge_tts', ...args]);
      res.setHeader('Content-Type', 'audio/mpeg');
      proc2.stdout.pipe(res);
      proc2.on('error', reject);
      proc2.on('close', code => (code === 0 ? resolve() : reject(new Error(`edge-tts exited ${code}`))));
    });

    proc.on('close', code => (code === 0 ? resolve() : reject(new Error(`edge-tts exited ${code}`))));
  });
}

module.exports = { isConfigured, isConfiguredSync, listVoices, findVoice, generateAudio, streamAudio, VOICES };
