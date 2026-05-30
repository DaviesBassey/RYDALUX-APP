# RYDALUX Staging Secrets Setup & Governance Guide

This document describes the environment secrets, configuration steps, best practices, and emergency governance procedures required to set up and manage secrets for the **RYDALUX Staging Environment** on GitHub.

---

## 1. Purpose

This guide establishes the boundary policies, lists of required keys, rotation frequencies, and emergency recovery strategies to keep our staging infrastructure secure. Staging is a **mock-production environment**. It must never use production secrets, real customer credentials, or live financial providers.

---

## 2. GitHub Environment Setup

To isolate staging variables from other development branches, we use GitHub Environments. Follow these steps to configure the environment:

1. Navigate to your repository homepage on GitHub: [DaviesBassey/RYDALUX-APP](https://github.com/DaviesBassey/RYDALUX-APP).
2. Click on the **Settings** tab.
3. In the left-hand sidebar, go to **Security** → **Environments**.
4. Click **New environment**.
5. Name the environment exactly `staging` and click **Configure environment**.
6. Under **Environment secrets**, click **Add secret** for each required key listed in the section below.

---

## 3. Required Staging Secrets Registry

The following secrets must be securely added to the `staging` environment. Never commit real values to Git.

| Secret Name | Purpose | Example / Placeholder Format |
| :--- | :--- | :--- |
| `STAGING_DATABASE_URL` | Staging PostgreSQL connection string (must have PostGIS). | `postgresql://rydalux_stage:secret_pass@db-stage.provider.com:5432/rydalux` |
| `STAGING_REDIS_URL` | Staging Redis cache and queue connection URL. | `redis://:stage_redis_pass@redis-stage.provider.com:6379` |
| `STAGING_API_BASE_URL` | Public URL for the NestJS API gateway. | `https://api-staging.rydalux.com` |
| `STAGING_ADMIN_BASE_URL` | Public URL for the Next.js Admin dashboard web app. | `https://admin-staging.rydalux.com` |
| `STAGING_JWT_ACCESS_SECRET` | Cryptographically secure 256-bit JWT access token signing key (Min 32 characters). | `jwt-access-secret-32-chars-long-hex-or-string` |
| `STAGING_JWT_REFRESH_SECRET` | Cryptographically secure 256-bit JWT refresh token signing key (Min 32 characters). | `jwt-refresh-secret-32-chars-long-hex-or-string` |
| `STAGING_PAYSTACK_SECRET_KEY` | Paystack integration **test** secret key. | `sk_test_1234567890abcdef1234567890abcdef12345678` |
| `STAGING_PAYSTACK_PUBLIC_KEY` | Paystack integration **test** public key. | `pk_test_1234567890abcdef1234567890abcdef12345678` |
| `STAGING_PAYSTACK_WEBHOOK_SECRET` | Webhook verification secret for Staging Paystack events. | `whsec_1234567890abcdef1234567890abcdef` |
| `STAGING_FLUTTERWAVE_SECRET_KEY` | Flutterwave integration **test** secret key. | `FLWSECK_TEST-1234567890abcdef1234567890ab-X` |
| `STAGING_FLUTTERWAVE_PUBLIC_KEY` | Flutterwave integration **test** public key. | `FLWPUBK_TEST-1234567890abcdef1234567890ab-X` |
| `STAGING_FLUTTERWAVE_WEBHOOK_SECRET` | Webhook signature check secret for Staging Flutterwave. | `flw-webhook-secret-string-value` |
| `STAGING_STORAGE_ACCESS_KEY` | S3/MinIO bucket access key (KYC and signatures storage). | `STAGEACCESSKEY12345` |
| `STAGING_STORAGE_SECRET_KEY` | S3/MinIO bucket secret key. | `stagesecretkey1234567890abcdef12345678` |
| `STAGING_STORAGE_BUCKET` | S3/MinIO bucket name. | `rydalux-staging-uploads` |
| `STAGING_STORAGE_REGION` | Staging storage region provider. | `us-east-1` |
| `STAGING_CORS_ORIGINS` | Allowed CORS origins for the staging environment. | `https://admin-staging.rydalux.com,http://localhost:3000` |
| `STAGING_MAPS_API_KEY` | Google Maps API key restricted to geofencing services. | `AIzaSyStagingKeyExample1234567890abcdef` |
| `STAGING_SMS_PROVIDER_KEY` | Africa's Talking API key (mock or test sandbox context only). | `at_apikey_staging_placeholder_value_12345` |
| `STAGING_EMAIL_PROVIDER_KEY` | Email provider token (SendGrid / Mailgun staging sandbox key). | `SG.staging_email_provider_key_placeholder` |

---

## 4. Staging Safety Safeguards & Constraints

> [!WARNING]
> **Strict Environment Isolation Rules:**
> 1. **No Live Payment Keys**: Only use credentials starting with `sk_test_`, `pk_test_`, `FLWSECK_TEST-` or `FLWPUBK_TEST-`. Real payments must never be active on staging.
> 2. **Isolated Storage**: Dedicated staging object buckets must be used. Staging must never read/write to production buckets or share credentials.
> 3. **Non-Destructive Database**: The staging database is a shared test asset. Automated migrations must use `prisma migrate deploy` to prevent data truncation or table loss.
> 4. **No Real Customer Data**: If cloning production databases to recreate staging edge cases, customer names, telephone numbers, banking tokens, and location logs must be strictly anonymized/masked.

---

## 5. Governance & Access Control

*   **Edit Permissions**: Only **Repository Owners** and authorized **Lead DevOps Engineers** should be granted write access to Environment Secrets.
*   **Secret Sharing Prohibitions**: Never transmit real staging secrets over insecure channels (such as Slack, email, Discord, or regular chat windows). Use secure password vaults (e.g. 1Password, Bitwarden, AWS Secrets Manager) for team credential handoffs.
*   **No Echoing**: Never print secret variables to standard output or CI/CD logs. All pipeline tasks must reference variables natively via `${{ secrets.SECRET_NAME }}` which GitHub automatically masks with asterisks (`***`).

---

## 6. Secret Rotation Policy

To reduce credential exposure windows, staging secrets must be rotated under the following circumstances:

1.  **Routine Rotation**: Staging secrets (especially database credentials, storage keys, and API tokens) should be rotated every **90 days**.
2.  **Staff Offboarding**: Any credentials accessed by developers or engineers offboarding from the project must be revoked and rotated immediately.
3.  **Compromise / Breach**: If any secret is accidentally committed to a public space or printed in logs, proceed immediately to the Emergency Revocation Procedure below.

---

## 7. Emergency Secret Revocation Procedure

In the event of a secret leak, compromise, or suspected unauthorized access:

```mermaid
graph TD
    A[1. Identify Leaked Secret] --> B[2. Revoke Credentials at Provider Console]
    B --> C[3. Generate New Secret in Provider]
    C --> D[4. Update Secret in GitHub Environments Settings]
    D --> E[5. Cancel/Re-run Active Workflows]
    E --> F[6. Audit Access Logs for Anomalies]
```

1.  **Revoke Instantly**: Go directly to the provider console (e.g. AWS IAM Console, Paystack Dashboard, database server provider) and invalidate the compromised key or account credentials immediately.
2.  **Regenerate Credentials**: Generate a brand-new secure key or passphrase on the provider side.
3.  **Update GitHub Environment**: Go to the GitHub repository Settings → Environments → staging → click edit next to the compromised secret, and paste the new value.
4.  **Terminate Active Pipelines**: Cancel any running workflows that were using the compromised context to ensure no cached keys are used.
5.  **Audit Logs**: Check application, database, and API access logs during the compromise window to verify no unauthorized operations occurred.

---

## 8. Secrets Validation Checklist

Before declaring Staging environment ready, verify the following checklist:

- [ ] **Environment Created**: The GitHub Environment is named exactly `staging` (lowercase).
- [ ] **All 20 Secrets Added**: All secrets listed in Section 3 are fully set inside the `staging` environment console.
- [ ] **Staged Variable Check**: Verified that no secrets are hardcoded in code, documentation, or workflow configurations.
- [ ] **GitIgnore Validation**: The `.env` file is listed inside the root `.gitignore` to prevent local development secrets from being tracked by git.
- [ ] **Workflow Environment Ref**: `.github/workflows/staging-deploy.yml` references environment variables via secure `${{ secrets.STAGING_* }}` bindings.
- [ ] **No Cross-Pollination**: Production credentials have not been configured for any staging workflows or environments.
