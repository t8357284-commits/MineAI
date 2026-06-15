const axios = require('axios');
const logger = require('./logger');

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';
const PLAYHT_BASE = 'https://api.play.ht/api/v2';

function isElevenLabsConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

function isPlayHTConfigured() {
  return Boolean(process.env.PLAYHT_API_KEY && process.env.PLAYHT_USER_ID);
}

function isProviderConfigured(provider) {
  if (provider === 'elevenlabs') return isElevenLabsConfigured();
  if (provider === 'playht') return isPlayHTConfigured();
  return false;
}

/**
 * Generate speech audio (MP3) from text using ElevenLabs.
 * Uses the multilingual model so Arabic & English both work with any voice.
 * @returns {Promise<Buffer>}
 */
async function generateElevenLabsAudio({ text, voiceId, language }) {
  if (!isElevenLabsConfigured()) {
    throw new Error('ELEVENLABS_API_KEY not configured on server');
  }

  try {
    const response = await axios.post(
      `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
        timeout: 120000,
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

/**
 * Generate speech audio (MP3) from text using PlayHT.
 * @returns {Promise<Buffer>}
 */
async function generatePlayHTAudio({ text, voiceId, language }) {
  if (!isPlayHTConfigured()) {
    throw new Error('PLAYHT_API_KEY / PLAYHT_USER_ID not configured on server');
  }

  try {
    const response = await axios.post(
      `${PLAYHT_BASE}/tts/stream`,
      {
        text,
        voice: voiceId,
        voice_engine: 'PlayHT2.0',
        output_format: 'mp3',
        language: language === 'ar' ? 'arabic' : 'english',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PLAYHT_API_KEY}`,
          'X-User-Id': process.env.PLAYHT_USER_ID,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
        timeout: 120000,
      }
    );

    return Buffer.from(response.data);
  } catch (err) {
    const detail = err.response?.data
      ? Buffer.from(err.response.data).toString('utf-8').slice(0, 300)
      : err.message;
    logger.error(`PlayHT TTS error: ${detail}`);
    throw new Error(`PlayHT TTS error: ${detail}`);
  }
}

/**
 * Generate speech audio for the given provider.
 * @returns {Promise<Buffer>}
 */
async function generateSpeech(provider, { text, voiceId, language }) {
  if (provider === 'elevenlabs') return generateElevenLabsAudio({ text, voiceId, language });
  if (provider === 'playht') return generatePlayHTAudio({ text, voiceId, language });
  throw new Error(`Unsupported voice provider: ${provider}`);
}

module.exports = {
  generateSpeech,
  generateElevenLabsAudio,
  generatePlayHTAudio,
  isProviderConfigured,
  isElevenLabsConfigured,
  isPlayHTConfigured,
};
