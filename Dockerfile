# ─── SocialPulse AI — Dockerfile ─────────────────────────────────────────────
# Multi-stage build: builder → production
#
# NOTE: package-lock.json is not committed to this repo.
# The builder stage uses `npm install --omit=dev` instead of `npm ci`.
# bcrypt requires native compilation tools (python3, make, g++).

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Build tools required for bcrypt native bindings
RUN apk add --no-cache python3 make g++

COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma

# Use npm install (not npm ci) because package-lock.json is not present.
# --omit=dev keeps the image lean (no jest, nodemon, etc.)
RUN cd backend && \
    npm install --omit=dev && \
    npx prisma generate --schema=./prisma/schema.prisma

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001

# openssl: required by Prisma client at runtime
# wget:    used by Docker HEALTHCHECK
# python3 + pip: required for edge-tts (free TTS for FREE users)
RUN apk add --no-cache openssl wget python3 py3-pip && \
    pip3 install --no-cache-dir --break-system-packages edge-tts

WORKDIR /app

# Copy compiled node_modules from builder (includes native bcrypt .node files)
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Copy application source
COPY backend/ ./backend/
COPY frontend/public/ ./frontend/public/

# Create runtime directories and hand ownership to the app user
RUN mkdir -p logs data uploads && chown -R nodeapp:nodejs /app

USER nodeapp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health/ping || exit 1

# Run Prisma migrations then start the server.
# `prisma migrate deploy` is idempotent — safe to run on every container start.
CMD ["sh", "-c", "cd backend && npx prisma migrate deploy --schema=./prisma/schema.prisma && node server.js"]
