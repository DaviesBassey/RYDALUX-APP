# Rydalux

Full-stack ride-hailing platform with parcel delivery, fintech, and safety features.

## Stack

- **Mobile:** Expo React Native + TypeScript
- **Backend API:** NestJS + TypeScript (`services/api`)
- **Admin Dashboard:** Next.js + TypeScript (`apps/admin`)
- **Database:** PostgreSQL + PostGIS with Prisma ORM
- **Cache / Queue:** Redis + BullMQ
- **Storage:** S3-compatible (placeholder — file upload pending)
- **Payments:** Paystack + Flutterwave

## Workspaces

- `apps/mobile` — Rider & Driver mobile app
- `apps/admin` — Operations dashboard
- `services/api` — NestJS API (all business logic)
- `packages/prisma` — Database schema, migrations, Prisma client
- `packages/shared` — Shared TypeScript types

> **Note:** `apps/api` was a legacy boilerplate and has been removed. The active API is in `services/api`.

## Prerequisites

- Node.js 20+
- pnpm 9 (`npm install -g pnpm@9.0.0`)
- Docker & Docker Compose (optional, for local infrastructure)

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in all required values
```

### 3. Start infrastructure services

```bash
docker-compose up -d
```

This starts PostgreSQL + PostGIS, Redis, and MinIO.

### 4. Run database migrations

```bash
pnpm -C packages/prisma migrate deploy
pnpm -C packages/prisma generate
```

### 5. Seed admin roles and first admin user

```bash
# Required: set ADMIN_EMAIL and ADMIN_PASSWORD in .env first
# Password must be at least 12 characters.
pnpm -C services/api seed:admin
```

This creates:
- All RBAC roles and permissions
- The first Super Admin user (if `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set)

### 6. Start development servers

```bash
# All workspaces
pnpm dev

# Or individually:
pnpm -C services/api start
pnpm -C apps/admin dev
pnpm -C apps/mobile start
```

## Production Deployment

### Docker Compose (Recommended for Pilot)

```bash
# 1. Configure production environment
cp .env.example .env
# Edit .env:
#   NODE_ENV=production
#   POSTGRES_PASSWORD=<strong-password>
#   JWT_ACCESS_SECRET=<32+ chars>
#   JWT_REFRESH_SECRET=<32+ chars>
#   CORS_ORIGIN=https://admin.yourdomain.com
#   PAYSTACK_SECRET_KEY=sk_live_...
#   PAYSTACK_WEBHOOK_SECRET=whsec_...

# 2. Build images
docker compose --env-file .env -f docker-compose.prod.yml build

# 3. Run migrations from the one-off migration container
docker compose --env-file .env -f docker-compose.prod.yml run --rm api-migrate

# 4. Seed RBAC roles and the first admin user
docker compose --env-file .env -f docker-compose.prod.yml run --rm api-seed

# 5. Start runtime services
docker compose --env-file .env -f docker-compose.prod.yml up -d
```

### Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| API | 4000 | NestJS backend |
| Admin | 3000 | Next.js static dashboard (nginx) |
| PostgreSQL | internal only | Database |
| Redis | internal only | Cache & queues |

### Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Basic status |
| `GET /health/live` | Liveness probe (process running) |
| `GET /health/ready` | Readiness probe (DB + Redis connected) |

## Database Migrations

**Development:**
```bash
pnpm -C packages/prisma migrate dev
```

**Production:**
```bash
# Must run before starting or restarting API on staging/production.
docker compose --env-file .env -f docker-compose.prod.yml run --rm api-migrate
```

> Never run `migrate dev` in production. Always use `migrate deploy`.
> For Docker staging/production, use the one-off `api-migrate` service instead of execing into the non-root API runtime container.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | Yes | API listen port (default: 4000) |
| `LOG_LEVEL` | No | `debug`, `info`, `warn`, `error` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_ACCESS_SECRET` | Yes | Min 32 characters |
| `JWT_REFRESH_SECRET` | Yes | Min 32 characters |
| `CORS_ORIGIN` | Prod only | Comma-separated allowed origins |
| `PAYSTACK_SECRET_KEY` | Yes (payments) | Paystack live secret key |
| `PAYSTACK_WEBHOOK_SECRET` | Yes (payments) | Webhook verification secret |
| `FLUTTERWAVE_SECRET_KEY` | No | Flutterwave secret key |
| `FINANCE_SCHEDULER_DISABLED` | No | `true` to disable reconciliation jobs |

> The API validates all required secrets at startup and **crashes immediately** if anything is missing or weak in production.

## SMS / OTP Configuration

RYDALUX requires an SMS provider for OTP delivery in production.

### Africa's Talking (Recommended)

1. Sign up at [africastalking.com](https://africastalking.com)
2. Get your username and API key from the dashboard
3. Configure environment variables:

```bash
SMS_PROVIDER=africastalking
AFRICASTALKING_USERNAME=your_username
AFRICASTALKING_API_KEY=your_api_key
AFRICASTALKING_SENDER_ID=RYDALUX
```

### Development Mode

In `NODE_ENV=development`, OTP codes are returned directly in the API response (`devCode`). No SMS provider is needed.

### Production Safety

If `SMS_PROVIDER` is `none` or unset in production, OTP requests will fail with a clear error. This prevents silent delivery failures.

## Admin User Setup

The first Super Admin must be created via the seed script. There is no public API endpoint for admin registration.

```bash
# 1. Set credentials in .env
ADMIN_EMAIL=admin@rydalux.com
ADMIN_PASSWORD=change-me-min-12-chars

# 2. Run the seed from the one-off seed container
docker compose --env-file .env -f docker-compose.prod.yml run --rm api-seed
```

Requirements:
- Password must be at least 12 characters
- Password is hashed with bcrypt
- The script is idempotent — running twice will not duplicate the user
- The user is automatically assigned the "Super Admin" role

## Backup & Restore

### PostgreSQL Backup

```bash
# Daily backup
docker exec rydalux-postgres-1 pg_dump -U rydalux rydalux > backup-$(date +%Y%m%d).sql

# Upload to S3 / Backblaze B2
# Retention: 7 daily + 4 weekly
```

### PostgreSQL Restore

```bash
docker exec -i rydalux-postgres-1 psql -U rydalux rydalux < backup-20260101.sql
```

### Automated Backups (Deferred)

- Point-in-time recovery (WAL archiving)
- Cross-region replication
- Automated backup verification

These are recommended after pilot scale-up.

## Architecture

```
┌─────────────┐     ┌─────────────┐
│   Mobile    │────▶│  API (4000) │
│  (Expo/RN)  │     │   NestJS    │
└─────────────┘     └──────┬──────┘
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ▼                    ▼                    ▼
┌──────────┐      ┌─────────────┐      ┌─────────────┐
│ Postgres │      │    Redis    │      │  Payments   │
│ +PostGIS │      │             │      │  (Paystack) │
└──────────┘      └─────────────┘      └─────────────┘
                           ▲
┌─────────────┐            │
│   Admin     │────────────┘
│  (Next.js)  │
└─────────────┘
```

## Security

- JWT access tokens expire in 15 minutes
- Refresh tokens are hashed with bcrypt and device-bound
- OTP rate limiting: 3 requests / 60s, 5 verifications / 60s
- CORS is strict in production (no wildcards)
- Admin tokens are memory-only (no localStorage)
- Mobile tokens use iOS Keychain / Android Keystore (SecureStore)
- Environment validation crashes on missing secrets in production

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Build all workspaces |
| `pnpm -C services/api test` | Run API unit tests |
| `pnpm -C services/api test:e2e` | Run API E2E tests |
| `pnpm -C packages/prisma migrate deploy` | Deploy DB migrations |
| `pnpm -C packages/prisma generate` | Generate Prisma client |
| `pnpm -C services/api seed:admin` | Seed admin roles |

## License

Private — Rydalux Internal
