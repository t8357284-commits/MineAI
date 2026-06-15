/**
 * Voice catalog for the AI Voice Over Studio.
 *
 * Each entry maps a friendly voice definition to the underlying provider
 * voice id. These defaults use well-known public voice ids; replace them
 * with voice ids from your own ElevenLabs / PlayHT accounts (cloned or
 * premium voices) as needed — no code changes required elsewhere.
 *
 * ElevenLabs: any voice id works for both Arabic & English when the
 * "eleven_multilingual_v2" model is used (set automatically by ttsProviders).
 *
 * PlayHT: voice ids are full manifest URLs. The ones below are PlayHT's
 * publicly documented multilingual voices.
 */

const VOICES = {
  elevenlabs: {
    ar: {
      male: [
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (عربي)' },
        { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (عربي)' },
        { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (عربي)' },
      ],
      female: [
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (عربي)' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (عربي)' },
        { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (عربي)' },
      ],
    },
    en: {
      male: [
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (English)' },
        { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (English)' },
        { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (English)' },
      ],
      female: [
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (English)' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (English)' },
        { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (English)' },
      ],
    },
  },
  playht: {
    ar: {
      male: [
        { id: 's3://voice-cloning-zero-shot/d05a4b6e-2eb1-4d0e-9fad-9d9a3f4e3c1a/manifest.json', name: 'Mostafa (Arabic Male)' },
      ],
      female: [
        { id: 's3://voice-cloning-zero-shot/8d6c08f5-bda4-44a0-8f8a-bbe7c6f9a4c1/manifest.json', name: 'Layla (Arabic Female)' },
      ],
    },
    en: {
      male: [
        { id: 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/larry/manifest.json', name: 'Larry (English Male)' },
      ],
      female: [
        { id: 's3://voice-cloning-zero-shot/9f1ee23a-9108-4538-90be-8e62efc195b6/charlotte/manifest.json', name: 'Charlotte (English Female)' },
      ],
    },
  },
};

const PROVIDERS = ['elevenlabs', 'playht'];
const LANGUAGES = ['ar', 'en'];
const GENDERS = ['male', 'female'];

function listVoices({ provider, language, gender } = {}) {
  const providers = provider ? [provider] : PROVIDERS;
  const result = [];

  for (const p of providers) {
    if (!VOICES[p]) continue;
    const langs = language ? [language] : LANGUAGES;
    for (const lang of langs) {
      if (!VOICES[p][lang]) continue;
      const genders = gender ? [gender] : GENDERS;
      for (const g of genders) {
        const voices = VOICES[p][lang][g] || [];
        for (const v of voices) {
          result.push({ provider: p, language: lang, gender: g, voiceId: v.id, name: v.name });
        }
      }
    }
  }
  return result;
}

function findVoice(provider, voiceId) {
  const catalog = VOICES[provider];
  if (!catalog) return null;
  for (const lang of LANGUAGES) {
    for (const g of GENDERS) {
      const match = (catalog[lang]?.[g] || []).find(v => v.id === voiceId);
      if (match) return { provider, language: lang, gender: g, voiceId: match.id, name: match.name };
    }
  }
  return null;
}

module.exports = { VOICES, PROVIDERS, LANGUAGES, GENDERS, listVoices, findVoice };
