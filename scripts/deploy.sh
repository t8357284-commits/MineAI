#!/bin/bash
# ─── SocialPulse AI — Deploy / Update Script ─────────────────────────────────
# Usage: ./scripts/deploy.sh
# Run from the project root on your VPS.

set -euo pipefail

echo "═══════════════════════════════════════════════"
echo "  🚀  SocialPulse AI — Deploying..."
echo "═══════════════════════════════════════════════"

# ─── Validate prerequisites ────────────────────────────────────────────────────
command -v docker >/dev/null || { echo "❌ Docker not installed"; exit 1; }
command -v docker compose version >/dev/null 2>&1 || { echo "❌ Docker Compose V2 not installed"; exit 1; }

[ -f .env ] || { echo "❌ .env not found. Run: cp .env.example .env"; exit 1; }
source .env

[ -n "${DOMAIN:-}" ]            || { echo "❌ DOMAIN is not set in .env"; exit 1; }
[ -n "${JWT_SECRET:-}" ]        || { echo "❌ JWT_SECRET is not set"; exit 1; }
[ -n "${POSTGRES_PASSWORD:-}" ] || { echo "❌ POSTGRES_PASSWORD is not set"; exit 1; }
[ ${#JWT_SECRET} -ge 32 ]       || { echo "❌ JWT_SECRET must be at least 32 chars"; exit 1; }

echo "✅  Preflight checks passed"

# ─── Pull latest code ──────────────────────────────────────────────────────────
if [ -d .git ]; then
  echo "📥  Pulling latest code..."
  git pull origin main
fi

# ─── Build & restart ──────────────────────────────────────────────────────────
echo "🏗️   Building Docker image..."
docker compose build --no-cache app

echo "🔄  Restarting services..."
docker compose up -d --remove-orphans

# ─── Wait for health ───────────────────────────────────────────────────────────
echo "⏳  Waiting for app to be healthy..."
for i in $(seq 1 30); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' socialpulse_app 2>/dev/null || echo "starting")
  if [ "$STATUS" = "healthy" ]; then
    echo "✅  App is healthy!"
    break
  fi
  echo "   ... ($i/30) $STATUS"
  sleep 5
done

# ─── Run migrations ───────────────────────────────────────────────────────────
echo "🗄️   Running Prisma migrations..."
docker compose exec app sh -c "cd backend && npx prisma migrate deploy --schema=./prisma/schema.prisma"

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅  Deploy complete!"
echo "  🌐  https://${DOMAIN}"
echo "  📋  Logs: docker compose logs -f app"
echo "═══════════════════════════════════════════════"
