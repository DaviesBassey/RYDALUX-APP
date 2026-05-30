# RYDALUX Staging Deployment Dry-Run Guide

This guide describes our deployment dry-run runbook. It outlines the mock target architecture, configuration validations, dry-run commands, staging smoke-test plans, rollback simulations, and release go/no-go criteria.

---

## 1. Dry-Run Target Architecture

The dry-run simulates the exact infrastructure topology of our target Staging Environment locally:

* **NestJS API Service (Backend)**: Runs on host port `4000`, connecting via TCP to local Postgres and Redis instances.
* **Next.js Web Admin (Frontend)**: Runs on host port `3000`, communicating client-side with the NestJS API at `http://localhost:4000`.
* **PostgreSQL + PostGIS**: Exposed on local host port `5432` via Docker.
* **Redis**: Exposed on local host port `6379` via Docker.
* **MinIO Object Storage**: Exposed on local host port `9000` via Docker (simulating AWS S3 buckets).
* **React Native Expo Mobile Clients**: Listens on port `8081`, reading API base URL `http://localhost:4000`.

---

## 2. Dry-Run Verification Checklist

Perform these checks before executing any staging deployment commands:

- [ ] **Env Validation**: Validate that `.env.staging.example` files match the variables needed by the active service builds.
- [ ] **Docker Service Readiness**: Verify that Postgres, Redis, and MinIO containers are running and healthy.
- [ ] **Prisma Client Generation**: Run `prisma generate` to generate the up-to-date Client library from `schema.prisma`.
- [ ] **Prisma Migrate Status**: Verify that the local migration history has no drifts.
- [ ] **API Build**: Compile the NestJS backend and verify that it contains zero compilation errors.
- [ ] **API Unit Tests**: Run all 236 Jest assertions and verify that they pass successfully.
- [ ] **Admin Build**: Compile the Next.js production build and verify that all routes generate cleanly.
- [ ] **Mobile Typecheck**: Verify that the Expo app compiles with zero TypeScript errors or warnings.
- [ ] **CORS Origin Validation**: Verify that the API CORS config rejects unauthorized origins and permits only the staging web domain.
- [ ] **Webhook Test Mode**: Check that Paystack and Flutterwave keys are strictly restricted to `test` modes.
- [ ] **Storage placeholders**: Confirm S3 file attachment services use secure mock URL handlers.

---

## 3. Staging Env Validation Checklist

Verify that the following variables are present in the target vault and use safe test placeholders only:

* **`DATABASE_URL`**: Present, points to target Staging DB, uses strong password (no default strings).
* **`REDIS_URL`**: Present, points to staging Redis host.
* **`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`**: Present, 256-bit cryptographically secure strings.
* **`PAYSTACK_SECRET_KEY` / `PAYSTACK_WEBHOOK_SECRET`**: Present, restricted strictly to `sk_test_` and `pk_test_` scopes.
* **`CORS_ORIGIN`**: Configured to `https://admin-staging.rydalux.com` (no wildcards).
* **`NEXTAUTH_URL`**: Configured to `https://admin-staging.rydalux.com`.
* **`API_URL`**: Configured to `https://api-staging.rydalux.com`.
* **No Production Keys**: Absolutely no production credentials or live billing keys are defined.

---

## 4. Safe Dry-Run Execution Commands

Run these non-destructive commands in sequence to simulate a deployment dry-run locally:

### 4.1 Install & Generate
```bash
# 1. Install all monorepo dependencies
pnpm install

# 2. Generate updated Prisma Client libraries
pnpm --filter @rydulux/prisma generate
```

### 4.2 Verify Migration Schema Integrity
```bash
# 3. Check migration synchronization
DATABASE_URL="postgresql://rydalux:local_prod_password@localhost:5432/rydalux" npx prisma migrate status --schema packages/prisma/schema.prisma
```

### 4.3 Compile All Monorepo Workspaces
```bash
# 4. Build all services (API backend and Web Admin frontend)
pnpm build

# 5. Verify Mobile TypeScript type-safety
pnpm --filter @rydulux/mobile exec tsc -p tsconfig.json --noEmit
```

### 4.4 Run backend Test Suite
```bash
# 6. Verify Jest tests
pnpm --filter @rydulux/api-services-local test
```

### 4.5 Seed Administrative Roles (Non-Destructive)
```bash
# 7. Seed administrative settings (Permissions, Admin Users, balanced Ledgers)
pnpm db:seed
```

---

## 5. Deployment Smoke-Test Plan

Following a staging dry-run launch, perform the following validation calls:

### 5.1 Query Readiness Health check
```bash
curl -f http://localhost:4000/health/ready
```
* **Expected Response Shape**:
  ```json
  {
    "status": "ok",
    "info": {
      "database": { "status": "up" },
      "redis": { "status": "up" }
    },
    "error": {},
    "details": {
      "database": { "status": "up" },
      "redis": { "status": "up" }
    }
  }
  ```

### 5.2 Test Admin Login Authentication
```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@rydalux.local", "password":"LocalAdminPass123!", "fingerprint":"dry-run-cli", "deviceName":"Dry Run Tester"}' \
  http://localhost:4000/auth/admin/login
```
* **Expected Result**: Successfully returns `accessToken` and `refreshToken`.

---

## 6. Rollback Simulation Checklist

Prior to launching deployments, the DevOps team must confirm the following contingency checks:

- [ ] **Backup pre-migration snapshot**: Confirm that a full database snapshot is captured immediately preceding migration deployment.
- [ ] **Staged Container Retention**: Confirm that the previous stable container tag (e.g. `v1.2.3`) is kept in the container registry for instant rollback.
- [ ] **Config Flag fallback**: Check that incomplete or unstable integrations (e.g. Schedulers or SMS dispatch gateways) can be disabled immediately using runtime environment properties (`FINANCE_SCHEDULER_DISABLED=true` or `SMS_PROVIDER=none`).

---

## 7. Staging Dry-Run Go/No-Go Criteria

* **GO Criteria (All must pass)**:
  * Zero compilation errors on `pnpm build`.
  * All 236 Jest assertions pass cleanly.
  * Mobile typecheck exits with clean code 0.
  * Staging env variables contain strictly `test` keys.
  * Health check liveness/readiness indicators return `200 OK`.
  * Authentication login gateway returns JWT access tokens.
* **NO-GO Criteria (Any triggers delay)**:
  * Presence of any production secret or live billing key.
  * Schema migrations fail to apply to the target DB.
  * Database or Redis connection readiness status is `down`.

---

## 8. Known Limitations

* **Mock External Services**: External services such as SMS gateway and real payment processing are strictly simulated in the staging dry-run; no real-world money or messages will be transmitted.
* **Database Snapshot Integrity**: During dry-run, if a destructive migration fails, automated rollback requires manual restoration of the pre-migration database snapshot.
* **Push Notifications**: Push notifications are configured using mock tokens and will not deliver to actual devices.
