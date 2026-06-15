/**
 * ElevenLabs TTS Provider
 * Premium-quality voices for PRO users.
 * Supports Arabic & English via eleven_multilingual_v2.
 */
'use strict';

const axios  = require('axios');
const logger = require('../logger');

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

// ─── Capability check ────────────────────────────────────────
function isConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY) &&
         process.env.ELEVENLABS_ENABLED !== 'false';
}

// ─── Voice catalog (premium voices) ─────────────────────────
const VOICES = {
  ar: {
    male: [
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (عربي)',    preview: null },
      { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (عربي)',  preview: null },
      { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (عربي)', preview: null },
    ],
    female: [
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (عربي)', preview: null },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (عربي)',  preview: null },
      { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (عربي)',   preview: null },
    ],
  },
  en: {
    male: [
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (English)',    preview: null },
      { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (English)',  preview: null },
      { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (English)', preview: null },
    ],
    female: [
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (English)', preview: null },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (English)',  preview: null },
      { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (English)',   preview: null },
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
          provider : 'elevenlabs',
          tier     : 'premium',
          language : lang,
          gender   : g,
          voiceId  : v.id,
          name     : v.name,
          preview  : v.preview,
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
      if (match) return { provider: 'elevenlabs', tier: 'premium', language: lang, gender: g, voiceId: match.id, name: match.name };
    }
  }
  return null;
}

// ─── Audio generation ────────────────────────────────────────
/**
 * Generate MP3 audio buffer from ElevenLabs.
 * @param {{ text: string, voiceId: string, language: string }} opts
 * @returns {Promise<Buffer>}
 */
async function generateAudio({ text, voiceId, language }) {
  if (!isConfigured()) throw new Error('ElevenLabs is not configured (missing ELEVENLABS_API_KEY)');

  try {
    const response = await axios.post(
      `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      },
      {
        headers: {
          'xi-api-key'   : process.env.ELEVENLABS_API_KEY,
          'Content-Type' : 'application/json',
          Accept         : 'audio/mpeg',
        },
        responseType : 'arraybuffer',
        timeout      : 120_000,
      }
    );
    return Buffer.from(response.data);
  } catch (err) {
    const detail = err.response?.data
      ? Buffer.from(err.response.data).toString('utf-8').slice(0, 300)
      : err.message;
    logger.error(`ElevenLabs TTS error: ${detail}`);
    throw new Error(`ElevenLabs TTS error: ${detail}`);
  }
}

module.exports = { isConfigured, listVoices, findVoice, generateAudio, VOICES };
