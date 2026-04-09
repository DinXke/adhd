FROM node:22-slim AS base
WORKDIR /app

# Systeem-dependencies voor native modules en Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl libssl-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Dependencies (inclusief native compile via postinstall)
COPY package*.json ./
RUN npm ci

# Prisma genereren
COPY prisma ./prisma
RUN npx prisma generate

# Source kopieren en builden
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Productie image ─────────────────────────────────────────
FROM node:22-slim AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates wget python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# Native modules moeten opnieuw worden gecompileerd in de productie-image
RUN npm ci --omit=dev

COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/dist ./dist
COPY prisma ./prisma

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

# db push voor initiële setup; later vervangen door migrate deploy zodra migraties aangemaakt zijn
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
