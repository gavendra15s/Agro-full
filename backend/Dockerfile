# ─── Stage 1: Install dependencies ──────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─── Stage 2: Build TypeScript → JavaScript ─────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# ─── Stage 3: Production image ──────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup --system --gid 1001 agrosafe && \
    adduser --system --uid 1001 agrosafe

# Copy only production deps and compiled output
COPY --from=deps   /app/node_modules ./node_modules
COPY --from=builder /app/dist        ./dist
COPY package.json ./

# Supabase migrations can be useful for reference inside container
COPY supabase/ ./supabase/

USER agrosafe

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "dist/server.js"]
