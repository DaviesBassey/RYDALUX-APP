# RYDALUX Staging Deployment & Runbook Guide

This runbook describes the preparation, deployment checklist, environment configurations, smoke test procedures, risk registers, and rollback strategies required to deploy the RYDALUX ecosystem to the Staging Environment.

---

## 1. Staging Deployment Checklist

Follow this checklist when preparing and executing the staging deployment:

### 1.1 Infrastructure & Component Provisioning
- [ ] **Staging Database (PostgreSQL + PostGIS)**: Provision database server with PostGIS extension enabled. Enforce strict firewall rules allowing access only from the API server and authorized bastion hosts.
- [ ] **Staging Caching & Queue (Redis)**: Setup managed Redis cluster for session caching and job queueing.
- [ ] **Object Storage (S3 / Cloud Store)**: Provision secure object storage bucket for KYC documents, vehicle registration uploads, and shipment signature proofs.
- [ ] **Backend Hosting (API Gateway)**: Provision server/container context (e.g. AWS ECS, GCP Cloud Run, Heroku) for the NestJS API service.
- [ ] **Frontend Hosting (Admin Portal)**: Provision container/server context for the Next.js Admin dashboard web app.

### 1.2 DNS, Networking & Security
- [ ] **Domains & Subdomains**:
  * API Gateway: `api-staging.rydalux.com`
  * Admin Portal: `admin-staging.rydalux.com`
- [ ] **SSL / HTTPS Certificates**: Provision Let's Encrypt or ACM certificates. Enforce `HTTP Strict Transport Security (HSTS)` and automatic redirection to HTTPS.
- [ ] **Firewall & CORS Config**: Allow `api-staging.rydalux.com` to receive cross-origin requests specifically from `admin-staging.rydalux.com` and local debug environments. Reject all unlisted origins.

### 1.3 Deployment Execution Sequence
- [ ] **Step 1: Code Freeze & CI/CD Pass**: Ensure unit test suite and TypeScript compilers pass cleanly with exit code 0.
- [ ] **Step 2: Environment Provisioning**: Set environment variables (using safe vault injection, never commit raw secrets).
- [ ] **Step 3: Database Schema Migration**: Execute conformed Prisma migration scripts:
  ```bash
  npx prisma migrate deploy
  ```
- [ ] **Step 4: Minimal Administrative Seeding**: Initialize permissions, base roles, and seed only the primary admin staff profiles. Avoid loading local QA dummy mock sets on staging unless requested.
- [ ] **Step 5: API Service Boot**: Start the NestJS backend and verify health endpoints.
- [ ] **Step 6: Admin Dashboard Boot**: Start Next.js admin dashboard.
- [ ] **Step 7: Smoke Testing**: Execute the smoke test verification checklist.

---

## 2. API Health Checks & Readiness Verification

The NestJS backend includes built-in endpoints for monitoring system integrity:

### 2.1 Health Check Endpoints
* **Liveness Probe**: `GET /health/live`
  * **Description**: Verifies that the API service is booted up and running.
  * **Expected Response Status**: `200 OK`
  * **Expected Response Shape**:
    ```json
    {
      "status": "ok",
      "info": {},
      "error": {},
      "details": {}
    }
    ```
* **Readiness Probe**: `GET /health/ready`
  * **Description**: Verifies that the API service can establish connections to the PostgreSQL database and Redis caching servers.
  * **Expected Response Status**: `200 OK` (or `503 Service Unavailable` if database/redis is down).
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

---

## 3. Staging Smoke Test Checklist

Execute these manual verification items immediately following a staging deployment:

- [ ] **Admin Portal Login**: Navigate to `https://admin-staging.rydalux.com/login` and log in with your administrative credentials. Ensure session contexts and JWT access tokens are successfully generated.
- [ ] **Dashboard Metrics**: Verify that the main overview screen loads stat cards without infinite loaders or API retrieval failures.
- [ ] **Rider & Driver Profiles**: Audit user search lists and verify that mock KYC review flows execute.
- [ ] **Ride Request Life Cycle**: Initiate a mock ride dispatch from the rider simulator and verify that a driver receives the allocation.
- [ ] **Logistics Shipment Life Cycle**: 
  - Request a package quote and book the shipment.
  - Verify that secure double-blind pickup and delivery OTP hashes are generated and validated via the driver interface.
  - Confirm delivery by uploading signature proofs.
- [ ] **Financial Audit Registry**: Audit ledger entries and verify transaction balance counts.
- [ ] **Support Desk chat**: Open support tickets, post messages, and verify that internal notes remain hidden.
- [ ] **Safety Center SOS monitoring**: Trigger the Panic SOS alarm and verify that safety officers receive real-time dashboard notifications.

---

## 4. Rollback & Contingency Plan

### 4.1 Application Rollback
* **Containerized Deployment (GCP / AWS ECS)**: Roll back to the previous stable container image tag (e.g. tag `v1.2.3`). This should be completed immediately if the api service fails readiness health check probes.
* **Static Web Hosting (Vercel / Netlify)**: Redeploy the previous verified git commit branch hash instantly via dashboard overrides.

### 4.2 Database Rollback Limitations & Safeguards
> [!CAUTION]
> **Schema Rollback Warnings:**
> Direct rollback of migrations on a shared staging database carries high risk of data loss. Enforce the following safeguards:
> 1. Always execute a full database backup immediately preceding any migration deployment.
> 2. Avoid using `prisma migrate resolve` or destructive schema alters without checking transaction safety.
> 3. If a deployed schema change has caused database issues, do not attempt to retroactively alter tables. Instead, roll back the API version to a safe compatibility level, deploy a backwards-compatible migration to revert constraints, and restore database tables from the pre-deployment backup if required.
> 4. To quickly contain high-risk features without modifying code, toggle conformed feature flag configurations in environment variables (e.g., set `FINANCE_SCHEDULER_DISABLED=true` or change `SMS_PROVIDER=none`).

---

## 5. Staging Risk Register

| Risk ID | Description | Impact | Likelihood | Mitigation Strategy |
|---------|-------------|--------|------------|---------------------|
| **SRK-01** | Real Payment secrets are set in test mode. | Medium | Low | Restrict staging API Paystack tokens to strict `pk_test_` and `sk_test_` scopes. Disable real credit card collection. |
| **SRK-02** | Staging SMS dispatch costs. | Low | Medium | Utilize SMS mock adapters (`SMS_PROVIDER=none` or test sandbox mode) to prevent cellular fees during QA smoke tests. |
| **SRK-03** | Map geofences limit precision. | Medium | Low | Staging will use linear distance calculations. Setup dedicated development keys for Google Maps API to restrict billing. |
| **SRK-04** | Upload bucket credentials leak. | High | Low | Enforce strict CORS policies on S3/MinIO staging buckets. Reject all direct file reads without signed URL handshakes. |
| **SRK-05** | CORS or domain mismatches. | High | Medium | Carefully configure CORS origins inside staging variables. Never use wildcard `*` domains in the API or Admin configurations. |
