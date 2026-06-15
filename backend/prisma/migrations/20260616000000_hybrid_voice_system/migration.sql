-- ============================================================
-- Migration: 20260616000000_hybrid_voice_system
-- Adds Edge TTS support and extends VoiceJob / GeneratedAudio
-- with performance, dedup, and admin-settings columns.
-- ============================================================

-- 1. Extend the VoiceProvider enum to include 'edge_tts'
ALTER TYPE "VoiceProvider" ADD VALUE IF NOT EXISTS 'edge_tts';

-- 2. VoiceJob — new columns
ALTER TABLE "VoiceJob"
  ADD COLUMN IF NOT EXISTS "processingTime" INTEGER,
  ADD COLUMN IF NOT EXISTS "fallbackUsed"   BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. GeneratedAudio — new columns
ALTER TABLE "GeneratedAudio"
  ADD COLUMN IF NOT EXISTS "sizeBytes"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "contentHash"  TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "fromCache"    BOOLEAN NOT NULL DEFAULT FALSE;

-- Back-fill sizeBytes from existing size column
UPDATE "GeneratedAudio" SET "sizeBytes" = "size" WHERE "sizeBytes" = 0 AND "size" > 0;

-- 4. New indexes for performance
CREATE INDEX IF NOT EXISTS "VoiceJob_provider_createdAt_idx"
  ON "VoiceJob"("provider", "createdAt");

CREATE INDEX IF NOT EXISTS "GeneratedAudio_contentHash_idx"
  ON "GeneratedAudio"("contentHash");

-- 5. Admin settings table — feature flags for providers
CREATE TABLE IF NOT EXISTS "AdminSetting" (
  "key"       TEXT        NOT NULL PRIMARY KEY,
  "value"     TEXT        NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default provider settings (idempotent)
INSERT INTO "AdminSetting" ("key", "value") VALUES
  ('EDGE_TTS_ENABLED',    'true'),
  ('ELEVENLABS_ENABLED',  'true')
ON CONFLICT ("key") DO NOTHING;
