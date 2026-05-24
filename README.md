# Rydalux Monorepo

A full-stack monorepo for mobile, backend, and admin dashboard using:

- Expo React Native + TypeScript
- NestJS + TypeScript backend API
- Next.js + TypeScript admin dashboard
- PostgreSQL + PostGIS with Prisma
- Redis + BullMQ for queues and caching
- Supabase Storage / S3-compatible storage
- Custom auth and payments integration placeholders

## Workspaces

- `apps/mobile` — Expo mobile app
- `apps/api` — NestJS API service
- `apps/admin` — Next.js admin dashboard
- `packages/shared` — shared TypeScript types and helpers
- `packages/prisma` — Prisma schema and database models

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Start development:

```bash
pnpm dev
```

## Local Services

- PostgreSQL + PostGIS
- Redis

> Add local Docker support and environment `.env` files before running services.
