-- CreateEnum
CREATE TYPE "VoiceProvider" AS ENUM ('elevenlabs', 'playht');

-- CreateEnum
CREATE TYPE "VoiceLanguage" AS ENUM ('ar', 'en');

-- CreateEnum
CREATE TYPE "VoiceGender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "VoiceJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "VoiceJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "VoiceProvider" NOT NULL,
    "voiceId" TEXT NOT NULL,
    "voiceName" TEXT NOT NULL DEFAULT '',
    "language" "VoiceLanguage" NOT NULL,
    "gender" "VoiceGender" NOT NULL,
    "text" TEXT NOT NULL,
    "status" "VoiceJobStatus" NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedAudio" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voiceJobId" TEXT NOT NULL,
    "provider" "VoiceProvider" NOT NULL,
    "voiceId" TEXT NOT NULL,
    "voiceName" TEXT NOT NULL DEFAULT '',
    "language" "VoiceLanguage" NOT NULL,
    "gender" "VoiceGender" NOT NULL,
    "text" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "publicId" TEXT NOT NULL DEFAULT '',
    "format" TEXT NOT NULL DEFAULT 'mp3',
    "size" INTEGER NOT NULL DEFAULT 0,
    "durationSec" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedAudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceJob_userId_createdAt_idx" ON "VoiceJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VoiceJob_status_createdAt_idx" ON "VoiceJob"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedAudio_voiceJobId_key" ON "GeneratedAudio"("voiceJobId");

-- CreateIndex
CREATE INDEX "GeneratedAudio_userId_createdAt_idx" ON "GeneratedAudio"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedAudio_provider_idx" ON "GeneratedAudio"("provider");

-- AddForeignKey
ALTER TABLE "VoiceJob" ADD CONSTRAINT "VoiceJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedAudio" ADD CONSTRAINT "GeneratedAudio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedAudio" ADD CONSTRAINT "GeneratedAudio_voiceJobId_fkey" FOREIGN KEY ("voiceJobId") REFERENCES "VoiceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
