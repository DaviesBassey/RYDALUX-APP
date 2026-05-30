# RYDALUX Staging Account Provisioning Checklist

This checklist serves as the definitive step-by-step operational runbook to provision, configure, and verify the accounts and cloud systems for the RYDALUX Staging Environment.

---

## 1. Railway Infrastructure Provisioning

Railway hosts the API container, PostgreSQL database, and Redis cache.

- [ ] **1.1 Workspace Setup**:
  - Sign in or create a developer workspace on [Railway.app](https://railway.app).
  - Create a new project and rename it to `rydalux-staging`.
- [ ] **1.2 PostgreSQL Provisioning (PostGIS Enabled)**:
  - **Do NOT use vanilla Railway Postgres** (as it lacks pre-installed PostGIS binaries required for geospatial types).
  - Click **Add Service** → **Docker Image** and use a PostGIS container image (such as `postgis/postgis:15-3.4` or search Railway's templates for a PostGIS-enabled Postgres setup).
  - Document the internally routed database connection URL (`DATABASE_URL`).
- [ ] **1.3 PostgreSQL Geospatial PostGIS Setup**:
  - Open the query panel of your PostGIS database service.
  - Run the following check to ensure PostGIS is fully enabled/compiled before executing Prisma migrations:
    ```sql
    CREATE EXTENSION IF NOT EXISTS postgis;
    ```
  - Verify that the query returned success and the extension is fully enabled.
- [ ] **1.4 Redis Provisioning**:
  - Click **Add Service** → **Database** → **Add Redis**.
  - Document the internal Redis connection URL (`REDIS_URL`).
- [ ] **1.5 NestJS API Container Setup**:
  - Click **Add Service** → **GitHub Repo** → Import your repository: `DaviesBassey/RYDALUX-APP`.
  - Open the API service settings panel and apply:
    - **Source Directory**: `services/api`
    - **Build Command**: `pnpm install --frozen-lockfile && pnpm --filter @rydulux/prisma generate && pnpm build`
    - **Start Command**: `pnpm --filter @rydulux/api-services-local start:prod`
    - **Healthcheck Path**: `/health/ready` (expect status `200`)
    - **Port**: Set `PORT` variable to `4000` (PaaS routing target).

---

## 2. Vercel Frontend Provisioning

Vercel hosts the static, optimized Next.js Web Administration dashboard.

- [ ] **2.1 Account Integration**:
  - Create or sign in to your [Vercel](https://vercel.com) account.
- [ ] **2.2 Project Import**:
  - Import the GitHub repository: `DaviesBassey/RYDALUX-APP`.
- [ ] **2.3 Project Configurations**:
  - **Framework Preset**: Next.js
  - **Root Directory**: `apps/admin`
  - **Build Command**: `next build`
  - **Output Settings**: Let Vercel auto-configure `.next` build assets.
- [ ] **2.4 Staging Environments**:
  - Add `NEXT_PUBLIC_API_URL` variable pointing to the public Railway API endpoint (e.g., `https://rydalux-api-stage.up.railway.app`).
- [ ] **2.5 Domain Recordation**:
  - Trigger deployment, allow to build, and document the generated public staging URL (e.g., `https://rydalux-admin-staging.vercel.app`).

---

## 3. Supabase Private Storage Provisioning

Supabase Storage serves as the secure repository for shipment signatures, support proof attachments, and KYC documents.

- [ ] **3.1 Project Setup**:
  - Sign in to your [Supabase Console](https://supabase.com) and create a project named `rydalux-staging`.
- [ ] **3.2 Private Bucket Creation**:
  - Go to **Storage** → Click **New Bucket**.
  - Name the bucket exactly `rydalux-staging-uploads`.
  - **Ensure "Public bucket" is disabled** (all file access will be governed by short-lived, pre-signed download handshakes).
- [ ] **3.3 S3-Compatible Configuration API Key Collection**:
  - Go to **Project Settings** → **Storage**.
  - Enable and collect the S3-compatible Access Key ID and Secret Access Key.
  - Collect the Endpoint URL and Region identifier.

---

## 4. GitHub Staging Environment & Secrets Configuration

All staging deployment credentials must be securely populated inside the GitHub Environment console.

- [ ] **4.1 Environment Boundary Setup**:
  - Go to [DaviesBassey/RYDALUX-APP](https://github.com/DaviesBassey/RYDALUX-APP) on GitHub.
  - Go to **Settings** → **Security** → **Environments** → Click **New environment**.
  - Name the environment exactly `staging` and click **Configure environment**.
- [ ] **4.2 Secrets Population**:
  - Add the following secrets inside the `staging` environment boundary (never under global actions variables):
    - [ ] `STAGING_DATABASE_URL` (From Railway Postgres `DATABASE_URL`)
    - [ ] `STAGING_REDIS_URL` (From Railway Redis `REDIS_URL`)
    - [ ] `STAGING_API_BASE_URL` (Public API url from Railway)
    - [ ] `STAGING_ADMIN_BASE_URL` (Public Admin url from Vercel)
    - [ ] `STAGING_JWT_ACCESS_SECRET` (Cryptographically secure 256-bit hex)
    - [ ] `STAGING_JWT_REFRESH_SECRET` (Cryptographically secure 256-bit hex)
    - [ ] `STAGING_PAYSTACK_SECRET_KEY` (Paystack test key: `sk_test_...`)
    - [ ] `STAGING_PAYSTACK_PUBLIC_KEY` (Paystack test key: `pk_test_...`)
    - [ ] `STAGING_PAYSTACK_WEBHOOK_SECRET` (Paystack test webhook secret)
    - [ ] `STAGING_STORAGE_ACCESS_KEY` (Supabase S3 access key)
    - [ ] `STAGING_STORAGE_SECRET_KEY` (Supabase S3 secret key)
    - [ ] `STAGING_STORAGE_BUCKET` (Value: `rydalux-staging-uploads`)
    - [ ] `STAGING_STORAGE_REGION` (Supabase Region)
    - [ ] `STAGING_CORS_ORIGINS` (Allowed frontend URL)
    - [ ] `STAGING_MAPS_API_KEY` (Restricted Maps staging API Key)
    - [ ] `STAGING_SMS_PROVIDER_KEY` (Africa's Talking Sandbox Key)
    - [ ] `STAGING_EMAIL_PROVIDER_KEY` (SendGrid Sandbox Key)
- [ ] **4.3 Repository Integrity Verification**:
  - Confirm that `.env` files are fully excluded by `.gitignore` and no staging variables are committed.

---

## 5. Strict Operational Constraints (What NOT to Do)

> [!CAUTION]
> **Strict Operational Redlines:**
> *   **NO LIVE PAYMENTS**: Never use live Paystack or Flutterwave tokens (`sk_live_...` or `pk_live_...`). Real transactions are strictly prohibited.
> *   **NO REAL CUSTOMER DATA**: All testing user accounts must use mock/fictional contact details and simulated coordinates.
> *   **NO BANNED DATABASE ACTIONS**: Never run `prisma migrate reset` or `prisma db push` on staging database clusters (only use non-destructive `prisma migrate deploy`).
> *   **NO PUBLIC STORAGE BUCKETS**: Object buckets must remain strictly private to protect user signatures and KYC privacy laws.
> *   **NO LOG EXPOSURES**: Never print secret variables or raw database credentials in standard output logs or CI logs.

---

## 6. Post-Provisioning Deployment & Verification Runbook

Execute this runbook once accounts are successfully created:

- [ ] **Step 1: Trigger Manual CD Workflow**:
  - Go to the **Actions** tab in the GitHub repository.
  - Select **Rydalux Staging Deployment** and click **Run workflow**.
  - Select branch `main` and run.
- [ ] **Step 2: Database Migration Check**:
  - Verify that the `Database Migration Deploy (Safe)` step successfully applies conformed Prisma migrations without geospatial errors.
- [ ] **Step 3: Administrative Seeding**:
  - Log in to the Railway console for the API service.
  - Set variables: `ADMIN_EMAIL=admin@rydalux.stage` and `ADMIN_PASSWORD=StageAdminPassword123!` (Min 12 chars).
  - Run the seed task command to initialize user security roles and register the primary Super Admin profile:
    ```bash
    pnpm --filter @rydulux/api-services-local seed:admin
    ```
- [ ] **Step 4: API Readiness Test**:
  - Request the health check status in your browser: `https://<STAGING_API_BASE_URL>/health/ready`.
  - Confirm HTTP status `200 OK` is returned and database/redis report `"status": "up"`.
- [ ] **Step 5: Admin Login Test**:
  - Navigate to the Vercel app login: `https://<STAGING_ADMIN_BASE_URL>/login`.
  - Log in with the seeded credentials. Confirm that you are successfully redirected to `/dashboard`.
- [ ] **Step 6: Signed URL Handoff Test**:
  - Perform a mock file upload on the support desk chat or shipment screen.
  - Verify that Supabase Storage correctly accepts the file and signs a short-lived download URL successfully.
