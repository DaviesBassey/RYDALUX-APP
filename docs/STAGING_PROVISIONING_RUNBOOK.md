# RYDALUX Staging Provisioning Runbook

This runbook provides complete, step-by-step instructions for provisioning, configuring, database migrating, seeding, and smoke testing the RYDALUX Staging Environment using the chosen PaaS hybrid architecture: **Railway** (API, Database, Cache) + **Vercel** (Admin Portal) + **Supabase Storage** (Object Storage).

---

## 1. Step-by-Step Provisioning Guides

Follow these steps sequentially to set up the infrastructure services.

### 1.1 Railway Setup: API, Database & Caching

Railway serves as our core runtime and database layer.

1.  **Register/Login**: Navigate to [Railway.app](https://railway.app) and sign in.
2.  **Create a Staging Project**:
    *   Click **New Project** → Select **Empty Project**.
    *   Go to **Project Settings** → Rename the project to `rydalux-staging`.
3.  **Provision PostgreSQL (PostGIS Enabled)**:
    *   **CRITICAL POLICY: Do not use vanilla Railway Postgres for RYDALUX staging.** Vanilla Postgres does not contain the pre-compiled PostGIS binaries required for geospatial types like `geography(Point,4326)`.
    *   Instead, click **Add Service** → **Docker Image** and use a PostGIS container image (such as `postgis/postgis:15-3.4` or search Railway's templates for a PostGIS-enabled Postgres setup).
    *   Once provisioned, click on the PostGIS database service → Go to the **Variables** tab. Copy the internal `DATABASE_URL` (e.g., `postgresql://...`) to your staging secrets clipboard.
4.  **Enable & Validate PostGIS Geographic Extension**:
    *   Geospatial tables will fail migrations if the extension is not explicitly enabled.
    *   Go to your PostGIS database service query panel (or connect via PgAdmin/bastion shell).
    *   Execute the following SQL command to initialize the spatial engine:
        ```sql
        CREATE EXTENSION IF NOT EXISTS postgis;
        ```
    *   Verify the installation by running `SELECT PostGIS_Version();` to confirm the version is outputted cleanly.
5.  **Provision Redis**:
    *   Click **Add Service** → **Database** → **Add Redis**.
    *   Wait for initialization, select the Redis service, go to **Variables**, and copy the `REDIS_URL` (e.g., `redis://...`).
6.  **Configure API Gateway Container**:
    *   Click **Add Service** → **GitHub Repo** → Link your repository: `DaviesBassey/RYDALUX-APP`.
    *   Once added, select the API Service and navigate to its **Settings** tab:
        *   **Source Directory**: Set to `services/api`.
        *   **Build Command**: Set to `pnpm install --frozen-lockfile && pnpm --filter @rydulux/prisma generate && pnpm build` (Railway automatically detects monorepo root config).
        *   **Start Command**: Set to `pnpm --filter @rydulux/api-services-local start:prod`.
        *   **Healthcheck Path**: Set to `/health/ready` with HTTP expected status `200`.

---

### 1.2 Vercel Setup: Admin Web Dashboard

Vercel hosts the Next.js static and server-rendered administration dashboard.

1.  Navigate to the [Vercel Dashboard](https://vercel.com) and click **Add New** → **Project**.
2.  Import the GitHub repository: `DaviesBassey/RYDALUX-APP`.
3.  In the Project Configuration panel:
    *   **Project Name**: `rydalux-admin-staging`.
    *   **Framework Preset**: Select **Next.js**.
    *   **Root Directory**: Set to `apps/admin`.
    *   **Build Command**: Set to `next build` (standard NextJS optimization).
    *   **Output Directory**: Let Vercel auto-configure `.next`.
4.  Configure Environment Variables:
    *   Add `NEXT_PUBLIC_API_URL` pointing to the public Railway API URL generated in Step 1.1 (e.g., `https://api-staging.rydalux.com`).
5.  Click **Deploy** and document the generated staging domain (e.g., `https://rydalux-admin-staging.vercel.app`).

---

### 1.3 Supabase Storage Setup: S3-Compatible Object Store

Supabase provides the S3-compatible file storage system required for ride-matching audits, supporting documents, and signature proofs.

1.  Log in to [Supabase.com](https://supabase.com) and click **New Project** → Name it `rydalux-staging`.
2.  Navigate to **Storage** in the sidebar.
3.  Click **New Bucket**:
    *   Name: `rydalux-staging-uploads`.
    *   **Public Toggle**: Leave **Disabled** (Staging buckets **must** remain private. All accesses will be handled using cryptographically signed short-lived URLs).
4.  Retrieve API Credentials:
    *   Go to **Project Settings** → **API**.
    *   Copy the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (which gives our API server access to manage files without public read policies).
    *   *(Optional S3 Handoff)*: If using standard S3 client mappings, copy the S3 Access Key ID, Secret Key, Region, and Endpoint from the Storage Settings tab.

---

## 2. GitHub Secrets Mapping Guide

All staging deployment credentials must be securely populated inside the GitHub Environment console (`Settings → Environments → staging → Environment secrets`). 

> [!IMPORTANT]
> **Use the exact mappings documented below. Never include real values here.**

| Secret Name | Value Source / Action | Example Placeholder Format |
| :--- | :--- | :--- |
| `STAGING_DATABASE_URL` | Copy the `DATABASE_URL` from the Railway **PostgreSQL** service variables. | `postgresql://postgres:pass@railway-db:5432/railway` |
| `STAGING_REDIS_URL` | Copy the `REDIS_URL` from the Railway **Redis** service variables. | `redis://:pass@railway-redis:6379` |
| `STAGING_API_BASE_URL` | The public domain Railway generated for your API Service. | `https://rydalux-api-stage.up.railway.app` |
| `STAGING_ADMIN_BASE_URL` | The public deployment domain Vercel generated for the Admin app. | `https://rydalux-admin-staging.vercel.app` |
| `STAGING_JWT_ACCESS_SECRET` | Generate a cryptographically secure 256-bit string. | `9ee3d1bf1e600... (min 32 chars)` |
| `STAGING_JWT_REFRESH_SECRET` | Generate a cryptographically secure 256-bit string. | `8da4f20ec689d... (min 32 chars)` |
| `STAGING_PAYSTACK_SECRET_KEY` | Paystack **Test** Secret Key (`sk_test_...`). | `sk_test_123456789abcde...` |
| `STAGING_PAYSTACK_PUBLIC_KEY` | Paystack **Test** Public Key (`pk_test_...`). | `pk_test_123456789abcde...` |
| `STAGING_PAYSTACK_WEBHOOK_SECRET` | Secret webhook key generated in the Paystack test dashboard. | `whsec_12345678...` |
| `STAGING_STORAGE_ACCESS_KEY` | S3 Access Key ID from your Supabase Project Settings. | `sb_access_key_stage_123` |
| `STAGING_STORAGE_SECRET_KEY` | S3 Secret Access Key from your Supabase Project Settings. | `sb_secret_key_stage_456` |
| `STAGING_STORAGE_BUCKET` | The name of your private staging storage bucket. | `rydalux-staging-uploads` |
| `STAGING_STORAGE_REGION` | The region of your Supabase project. | `eu-west-1` |
| `STAGING_CORS_ORIGINS` | Comma-separated list of allowed origins. | `https://rydalux-admin-staging.vercel.app` |
| `STAGING_MAPS_API_KEY` | Staging Google Maps restricted API Key. | `AIzaSyStagingGeoKey...` |
| `STAGING_SMS_PROVIDER_KEY` | Africa's Talking API key (mock or test sandbox token). | `at_apikey_staging_sandbox...` |
| `STAGING_EMAIL_PROVIDER_KEY` | Email provider token (SendGrid test token). | `SG.staging_email_sandbox...` |

---

## 3. Database Migration & Administrative Seeding

Migrations are executed securely inside the deployment pipeline using the `main` branch. 

### 3.1 Migration Execution Sequence
During the CD run, the pipeline will build, check out the prisma schema, and run:
```bash
pnpm --filter @rydulux/prisma exec prisma migrate deploy
```
*Note: Make sure that `CREATE EXTENSION IF NOT EXISTS postgis;` has been successfully executed in PostgreSQL prior to running migrations, otherwise tables with geospatial types (such as `TripLocation`) will fail to compile.*

### 3.2 Administrative Seeding (Idempotent)
To log in to the admin dashboard, you must run the idempotent seed script. Do **not** run the full local development mock seed data on staging.

Run the one-off admin seed command on Railway (via shell/terminal, or add it to the startup script/manual console):
```bash
# Explicitly set the target admin credentials in Railway variables first:
#   ADMIN_EMAIL=admin@rydalux.stage
#   ADMIN_PASSWORD=StageAdminPassword123! (min 12 characters)

pnpm --filter @rydulux/api-services-local seed:admin
```
This script creates:
*   Standard RBAC security groups and dashboard access roles.
*   The primary **Super Admin** profile with the password hashed securely using `bcrypt`.

---

## 4. Post-Provisioning Staging Smoke Test Suite

Verify system integrity using the following functional checklists immediately after the staging infrastructure boots.

### 4.1 API & Caching Readiness
*   Navigate in your browser to `https://<STAGING_API_BASE_URL>/health/ready`.
*   Verify that status is `200 OK` and both `database` and `redis` report `"status": "up"`.

### 4.2 Web Admin Authentication
*   Navigate to your Vercel URL: `https://<STAGING_ADMIN_BASE_URL>/login`.
*   Log in with the seeded credentials (`ADMIN_EMAIL` and `ADMIN_PASSWORD`).
*   Confirm that you are successfully redirected to `/dashboard` and that you receive an HTTP-only JWT access token inside your session cookies.

### 4.3 Logistics End-to-End Test (Test-Mode)
*   **Create Quote**: Trigger a mock shipment quote creation via client app or postman to `POST /shipments/quote`. Confirm the geographic distance is calculated.
*   **Paystack Webhook Verification**: Simulate a `charge.success` Paystack event targeting the API webhook path using your Paystack test webhook utility. Verify that the payment changes status in the database to `CAPTURED`.
*   **Signature signed URL proof**: Perform a mock signature file upload. Confirm that Supabase Storage signs the transaction and returns a cryptographically secure, short-lived signed URL for reading.

---

## 5. Rollback & Contingency Playbook

### 5.1 Application Code Reversion
*   **Railway Rollback**: If the API gateway fails health check probes or triggers runtime bugs:
    1. Navigate to the Railway project.
    2. Click on the API Service → Go to the **Activity** tab.
    3. Find the previous successful deployment and click **Redeploy**.
*   **Vercel Rollback**: If the NextJS dashboard breaks:
    1. Navigate to Vercel dashboard → Project deployments.
    2. Select the previous stable deployment card and click **Instant Rollback**.

### 5.2 Database Protection Safeguards
> [!CAUTION]
> **Data Integrity Warning:**
> 1. Staging deployment pipelines **must never** execute destructive DB schema changes (`prisma db push` or `prisma migrate reset` are strictly banned).
> 2. Always capture a pg_dump backup snapshot instantly preceding any staging migration:
>    ```bash
>    pg_dump -h <railway-db-host> -U postgres -d railway > pre-migration-stage.sql
>    ```
> 3. If a migration fails or corrupts data, roll back the API server image immediately to the previous compatible version to prevent writes, restore tables from `pre-migration-stage.sql`, and deploy a backwards-compatible schema fix.

---

## 6. PostGIS & Migration Troubleshooting Guide

During database migrations or system startup on staging, you may encounter PostGIS-related errors due to vanilla database setups. Use this guide to resolve them safely.

### 6.1 Common Geospatial Errors & Root Causes

#### Error 1: `ERROR: type "geography" does not exist`
*   **Root Cause**: The Prisma migration scripts attempt to create columns using the `Unsupported("geography(Point, 4326)")` type, but the PostGIS extension has not been enabled in the target database.
*   **Solution**: Connect to your database query console and execute:
    ```sql
    CREATE EXTENSION IF NOT EXISTS postgis;
    ```

#### Error 2: `ERROR: extension "postgis" is not available`
*   **Root Cause**: You are using a vanilla Railway PostgreSQL instance or standard image that does not have the PostGIS shared binary libraries compiled.
*   **Solution**: Terminate the service, and deploy using a PostGIS-enabled database container image (such as `postgis/postgis:15-3.4`).

---

### 6.2 Safe Staging Migration Verification Playbook

Always run these verification commands sequentially to prevent schema corruption or data loss:

```bash
# 1. Run local schema generation
corepack pnpm --filter @rydulux/prisma generate

# 2. Safely verify staging DB migration status before deploying
DATABASE_URL="<staging-db-url>" corepack pnpm --filter @rydulux/prisma exec prisma migrate status

# 3. If migrate status reports pending files, deploy them safely (NEVER use 'db push' or 'migrate reset')
DATABASE_URL="<staging-db-url>" corepack pnpm --filter @rydulux/prisma exec prisma migrate deploy

# 4. Check status again to verify the database is up-to-date and clean
DATABASE_URL="<staging-db-url>" corepack pnpm --filter @rydulux/prisma exec prisma migrate status
```
