#!/bin/bash
# ─── SocialPulse AI — First-time SSL Certificate Setup ───────────────────────
# Run ONCE before starting the full stack:
#   chmod +x scripts/init-ssl.sh && ./scripts/init-ssl.sh
#
# What it does:
#   1. Validates .env exists and DOMAIN is set
#   2. Starts nginx in HTTP-only mode (serves ACME challenge)
#   3. Issues Let's Encrypt certificate via certbot
#   4. Substitutes domain in nginx.conf
#   5. Brings everything up with HTTPS

set -euo pipefail

# ─── Load .env ────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "❌  .env not found. Copy .env.example → .env and fill it in."
  exit 1
fi
source .env

if [ -z "${DOMAIN:-}" ]; then
  echo "❌  DOMAIN is not set in .env"
  exit 1
fi

EMAIL="${LETSENCRYPT_EMAIL:-admin@${DOMAIN}}"
echo "🌐  Domain : $DOMAIN"
echo "📧  Email  : $EMAIL"
echo ""

# ─── Patch nginx.conf with real domain ────────────────────────────────────────
sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" nginx/nginx.conf
echo "✅  nginx.conf patched with domain"

# ─── Start nginx in HTTP-only mode (temp config for ACME) ─────────────────────
echo "🚀  Starting nginx for ACME challenge..."
docker compose up -d nginx

sleep 5

# ─── Issue certificate ─────────────────────────────────────────────────────────
echo "🔐  Requesting Let's Encrypt certificate..."
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --staging \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

# Uncomment below and remove --staging above for real certs:
# docker compose run --rm certbot certonly \
#   --webroot -w /var/www/certbot \
#   --email "$EMAIL" --agree-tos --no-eff-email \
#   -d "$DOMAIN" -d "www.$DOMAIN"

echo "✅  Certificate issued!"

# ─── Copy certs to nginx/ssl for fallback reference ───────────────────────────
mkdir -p nginx/ssl
echo "✅  SSL directory ready"

# ─── Start full stack ─────────────────────────────────────────────────────────
echo "🚀  Starting full stack..."
docker compose up -d

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅  SocialPulse AI is live!"
echo "  🌐  https://${DOMAIN}"
echo "═══════════════════════════════════════════════"
