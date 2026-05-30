# RYDALUX Staging Continuous Deployment (CD) Guide

## 1. Purpose
This document provides an overview of the Staging Continuous Deployment pipeline (`.github/workflows/staging-deploy.yml`). This workflow acts as the final validation boundary before code reaches production, deploying the latest changes to a live, mock-production staging environment.

## 2. Workflow Overview
The staging CD workflow mirrors the CI validation process but appends critical deployment and migration stages. 
Currently, the pipeline contains placeholders for artifact packaging, health checks, and notifications, as the target infrastructure is still being finalized.

## 3. Manual Trigger Instructions
By default, automatic deployments to staging are **disabled** to maintain stability. The workflow must be triggered manually:
1. Navigate to the **Actions** tab in the GitHub repository.
2. Select the **Rydalux Staging Deployment** workflow.
3. Click **Run workflow**.
4. Select the `main` branch (or target branch) and provide an optional reason.
5. Click **Run workflow** to initiate.

## 4. Required GitHub Environment Secrets
The deployment targets the `staging` GitHub Environment. The following secrets **must** be securely configured in the GitHub repository settings under `Environments > staging > Environment secrets`:

- `STAGING_DATABASE_URL`: Connection string for the Staging PostgreSQL database.
- `STAGING_REDIS_URL`: Connection string for the Staging Redis instance.
- `STAGING_API_BASE_URL`: Public URL of the Staging API (e.g., `https://api-staging.rydalux.com`).
- `STAGING_ADMIN_BASE_URL`: Public URL of the Staging Admin Web dashboard (e.g., `https://admin-staging.rydalux.com`).
- `STAGING_JWT_ACCESS_SECRET`: Cryptographically secure 256-bit string for staging access tokens.
- `STAGING_JWT_REFRESH_SECRET`: Cryptographically secure 256-bit string for staging refresh tokens.
- `STAGING_PAYSTACK_SECRET_KEY`: Paystack **Test** Secret Key (`sk_test_...`).
- `STAGING_PAYSTACK_PUBLIC_KEY`: Paystack **Test** Public Key (`pk_test_...`).
- `STAGING_PAYSTACK_WEBHOOK_SECRET`: Secret used to verify staging webhooks from Paystack.
- `STAGING_STORAGE_ACCESS_KEY`: Access key for staging object storage (e.g., AWS S3 or MinIO).
- `STAGING_STORAGE_SECRET_KEY`: Secret key for staging object storage.
- `STAGING_STORAGE_BUCKET`: Name of the staging storage bucket.
- `STAGING_CORS_ORIGINS`: Allowed CORS origins for staging (e.g., `https://admin-staging.rydalux.com`).

**CRITICAL POLICY: Never enter live production credentials, real billing API keys, or actual user data connection strings into the staging environment secrets.**

## 5. Deployment Stages
The workflow executes the following primary stages sequentially:
1. **Validation**: Installs dependencies, runs code compilation, and executes the full unit test suite.
2. **Packaging (Placeholder)**: Prepares the API Docker image and Next.js static builds.
3. **Migration (Safe)**: Safely applies pending database schema changes using `prisma migrate deploy`.
4. **Verification (Placeholder)**: Queries the staging healthcheck endpoint to ensure the new deployment is live and ready.

## 6. Migration Policy
Database migrations in the staging CD pipeline are strictly non-destructive.
- The pipeline uses `npx prisma migrate deploy`.
- **BANNED COMMANDS**: `prisma migrate reset` and `prisma db push` are strictly prohibited in the deployment pipeline to prevent catastrophic data loss.

## 7. Rollback Policy
If a staging deployment fails or introduces critical regressions:
1. Determine if the failure is code-related or database-related.
2. **Code Rollback**: Revert the offending commit in the `main` branch, merge the PR, and manually trigger the deployment workflow again.
3. **Database Rollback**: If a migration causes data corruption, restore the pre-migration snapshot taken prior to deployment, then proceed with the code rollback.

## 8. Healthcheck Policy
A post-deployment health check is required to verify system integrity. The pipeline will query the `/health/ready` endpoint. The deployment is considered successful only if the health check returns a `200 OK` status with all underlying services (DB, Redis) reporting `up`.

## 9. Known Limitations
- Continuous Deployment infrastructure components (Docker Registries, Vercel/AWS targets) are currently placeholders.
- The deployment notification system (Slack/Discord webhook integration) is a placeholder.
- Integration tests are not yet included in the Staging CD run due to environment complexity requirements.

## 10. Future Production Deployment Notes
Production deployment workflows will be introduced in a future phase. They will mirror the staging workflow structure but will mandate stricter governance, including mandatory required reviewers, multi-region deployment strategies, and enforced automated rollback triggers based on application performance monitoring (APM) metrics.