# RYDALUX Admin — Production Dockerfile
# Multi-stage: build static export, serve with nginx

# ── Stage 1: Build ──
FROM node:20-slim AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./

# Copy workspace package.json files
COPY packages/shared/package.json ./packages/shared/
COPY apps/admin/package.json ./apps/admin/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm -C apps/admin build

# ── Stage 2: Serve ──
FROM nginx:alpine AS runner

# Copy built static files to nginx html root
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

# Add a simple nginx config for SPA routing
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
