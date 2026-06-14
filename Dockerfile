FROM node:20-alpine AS builder
WORKDIR /app

COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma
RUN cd backend && npm install --omit=dev && npx prisma generate --schema=./prisma/schema.prisma

FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001
RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
COPY frontend/public/ ./frontend/public/

RUN mkdir -p logs data && chown -R nodeapp:nodejs /app

USER nodeapp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health/ping || exit 1

CMD ["sh", "-c", "cd backend && npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss && node server.js"]
