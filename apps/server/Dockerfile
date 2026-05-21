# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests first — Docker caches this layer until they change
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/types/package.json ./packages/types/

RUN npm ci

# Copy source after deps so code changes don't bust the install cache
COPY packages/types ./packages/types
COPY apps/server ./apps/server

# Generate Prisma client for Linux, then compile TypeScript
RUN cd apps/server && npx prisma generate && npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/prisma ./prisma
COPY --from=builder /app/apps/server/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/apps/server/package.json ./package.json

EXPOSE 3001

# Run DB migrations then start the server
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/index.js"]
