# RYDALUX API — Production Dockerfile
# Multi-stage build for smaller final image

# ── Stage 1: Build ──
FROM node:20-slim AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy workspace configuration first (dependency resolution)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./

# Copy workspace package.json files for monorepo install
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/shared/package.json ./packages/shared/
COPY services/api/package.json ./services/api/

# Install dependencies (hoisted to root node_modules)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client and build NestJS app
RUN pnpm -C packages/prisma generate
RUN pnpm -C services/api build
RUN ./node_modules/.bin/tsc services/api/prisma/seed.ts --outDir services/api/prisma-dist --module CommonJS --target ES2020 --moduleResolution Node --esModuleInterop --skipLibCheck

# ── Stage 2: Runtime ──
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install OpenSSL (required by Prisma query engine) and ca-certificates (for HTTPS SMS API calls).
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r rydalux && useradd -r -g rydalux rydalux

# Copy runtime artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/prisma-dist ./services/api/prisma-dist
COPY --from=builder /app/packages/prisma ./packages/prisma
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/services/api/package.json ./services/api/package.json

# Switch to non-root user
USER rydalux

EXPOSE 4000

CMD ["node", "services/api/dist/main.js"]
