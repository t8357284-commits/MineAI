# ✅ SocialPulse AI — Deployment Checklist

> Complete this checklist **top to bottom** for a fresh production deployment.
> For updates after initial deploy, jump to [§ Update Existing Deployment](#update-existing-deployment).

---

## 0. Server Prerequisites

```bash
# Install Docker Engine + Compose V2 (one-liner)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# Verify
docker --version          # Docker 24+
docker compose version    # Docker Compose v2.x
```

---

## 1. Upload / Clone Project

```bash
# Option A — SCP from local machine
scp -r socialpulse-v2/ user@YOUR_VPS_IP:/opt/socialpulse

# Option B — Git
ssh user@YOUR_VPS_IP
git clone https://github.com/youruser/socialpulse.git /opt/socialpulse
cd /opt/socialpulse
```

---

## 2. Environment Variables

```bash
cp .env.example .env
nano .env        # fill every value below
```

### Required variables (build will refuse to start if missing)

| Variable | Description | How to generate |
|---|---|---|
| `DOMAIN` | Your domain, no `https://` | e.g. `socialpulse.app` |
| `POSTGRES_PASSWORD` | DB password | `openssl rand -hex 24` |
| `JWT_SECRET` | JWT signing key ≥ 32 chars | `openssl rand -hex 32` |
| `API_SECRET_KEY` | API key ≥ 32 chars | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Anthropic key | console.anthropic.com |
| `ALLOWED_ORIGINS` | CORS whitelist | `https://yourdomain.com,https://www.yourdomain.com` |
| `APP_BASE_URL` | Full URL | `https://yourdomain.com` |
| `MAIL_FROM` | Sender address | `SocialPulse <no-reply@yourdomain.com>` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Email provider | See .env.example |

### Optional but recommended

| Variable | Default | Notes |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | — | Set `FILE_STORAGE=auto` to enable |
| `LETSENCRYPT_EMAIL` | `admin@$DOMAIN` | Used by certbot for expiry alerts |
| `FREE_DAILY_LIMIT` | `10` | AI requests/day for free users |
| `PRO_DAILY_LIMIT` | `100` | |
| `BUSINESS_DAILY_LIMIT` | `1000` | |

---

## 3. DNS — Point Domain to VPS

In your domain registrar / DNS panel:

```
A     @    →  YOUR_VPS_IP
A     www  →  YOUR_VPS_IP
```

Verify propagation before SSL step (can take 5–30 min):

```bash
dig +short yourdomain.com        # should return VPS IP
dig +short www.yourdomain.com
```

---

## 4. SSL Certificate (First Time Only)

```bash
cd /opt/socialpulse
chmod +x scripts/init-ssl.sh
./scripts/init-ssl.sh
```

The script:
1. Patches `nginx.conf` with your `$DOMAIN`
2. Starts nginx on port 80 to serve the ACME challenge
3. Runs certbot to issue the Let's Encrypt certificate
4. Brings up the full stack with HTTPS

> **Note:** The script uses `--staging` for the initial test run.
> After confirming nginx starts and certbot succeeds, edit the script,
> remove `--staging`, and re-run to get a trusted certificate.

---

## 5. Build Docker Image

```bash
docker compose build --no-cache
```

What happens:
- Stage 1 (builder): installs dependencies with `npm install --omit=dev`, compiles bcrypt native bindings, runs `prisma generate`
- Stage 2 (production): copies only production artifacts into a lean Alpine image

---

## 6. Start All Services

```bash
docker compose up -d
```

Startup order: `postgres` (healthy) → `app` (healthy) → `nginx` + `certbot`

---

## 7. Prisma Migrations

Migrations run **automatically** on every container start via the CMD:

```sh
cd backend && npx prisma migrate deploy --schema=./prisma/schema.prisma && node server.js
```

To run manually or check status:

```bash
# Check which migrations have been applied
docker compose exec app sh -c \
  "cd backend && npx prisma migrate status --schema=./prisma/schema.prisma"

# Force-apply pending migrations
docker compose exec app sh -c \
  "cd backend && npx prisma migrate deploy --schema=./prisma/schema.prisma"
```

---

## 8. Verify Deployment

```bash
# 1. All containers running and healthy
docker compose ps

# 2. App health endpoint
curl -sf https://yourdomain.com/api/health/ping && echo "✅ API OK"

# 3. Frontend loads (should return HTML)
curl -sf https://yourdomain.com | grep -i "socialpulse" && echo "✅ Frontend OK"

# 4. SSL certificate valid
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null \
  | openssl x509 -noout -dates

# 5. Application logs (no ERROR lines)
docker compose logs --tail=50 app
docker compose logs --tail=20 nginx
```

---

## 9. Update Existing Deployment

```bash
cd /opt/socialpulse

# Pull latest code (if using git)
git pull origin main

# Rebuild and restart app only (zero-downtime for DB and nginx)
docker compose build --no-cache app
docker compose up -d --no-deps app

# Migrations run automatically on restart.
# To run manually:
docker compose exec app sh -c \
  "cd backend && npx prisma migrate deploy --schema=./prisma/schema.prisma"
```

---

## 10. SSL Auto-Renewal

The `certbot` service checks for renewal every 12 hours automatically.
Certificates are renewed only when fewer than 30 days remain.

Manual renewal (if needed):

```bash
docker compose exec certbot certbot renew --webroot -w /var/www/certbot
docker compose restart nginx
```

---

## 11. Backup

```bash
# Database backup
docker compose exec postgres pg_dump \
  -U ${POSTGRES_USER:-socialpulse} \
  ${POSTGRES_DB:-socialpulse} \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
cat backup_YYYYMMDD_HHMMSS.sql | docker compose exec -T postgres psql \
  -U ${POSTGRES_USER:-socialpulse} \
  ${POSTGRES_DB:-socialpulse}
```

---

## 12. Useful Commands

```bash
# Live logs
docker compose logs -f app
docker compose logs -f nginx

# Open psql shell
docker compose exec postgres psql -U socialpulse -d socialpulse

# Prisma Studio (development only — do NOT expose publicly)
docker compose exec app sh -c \
  "cd backend && npx prisma studio --schema=./prisma/schema.prisma --port 5555"
# Then SSH tunnel: ssh -L 5555:localhost:5555 user@VPS_IP

# Restart individual service
docker compose restart app
docker compose restart nginx

# Full teardown (DATA PRESERVED in volumes)
docker compose down

# Full teardown INCLUDING data volumes (DESTRUCTIVE)
docker compose down -v
```

---

## Architecture Summary

```
Internet
   │
   ▼
[Nginx :443]  ← TLS termination, rate limiting, security headers
   │           ← pure reverse proxy — no filesystem access needed
   │ proxy_pass http://app:3000
   ▼
[Node.js :3000]  ← serves API (/api/*) + frontend (express.static)
   │               ← SPA fallback: any non-API GET → index.html
   ▼
[PostgreSQL :5432]  ← persistent data via named volume

[Certbot]  ← runs in background, renews SSL every 12h check
```

### Why Nginx does NOT serve static files directly

Node.js (`server.js`) already serves `frontend/public/` via `express.static`
and handles the SPA fallback (`app.get('*') → index.html`).

Mounting the frontend into the nginx container would require a shared volume
between `app` and `nginx` and tight path coupling. The reverse-proxy approach
is simpler, equally performant for most SaaS workloads, and eliminates the
blank-page / 404 bugs caused by path mismatches.
