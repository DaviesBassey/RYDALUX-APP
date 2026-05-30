# RYDALUX Staging Admin Seeding Guide

This document describes how to safely initialize administrative accounts and security roles on the **RYDALUX Staging Environment** using our conformed minimal staging seeder (`prisma/seed-staging.ts`).

---

## 1. Purpose & Safety Guarantees

In a live staging context, seeding realistic simulation or mock data (such as dummy rides, drivers, transaction ledger records, and geofences) carries a high risk of cluttering test systems, complicating manual smoke tests, and generating unnecessary operational billing events (such as real-world notification costs).

To prevent this, the Staging Admin Seeder enforces the following strict safety boundaries:
1. **Zero Mock Operations**: Does **not** seed any customers, drivers, vehicles, rides, shipments, payments, payouts, support tickets, ledger entries, or active geofence coordinate tracking records.
2. **Deterministic & Idempotent**: Uses PostgreSQL `upsert` queries bound to static UUID identifiers. If the script is run multiple times, it updates the existing records without duplicates.
3. **No Plaintext Storage**: Access passwords are cryptographically hashed using **bcrypt** (with a work factor of 10) before ingestion into the database.
4. **Environment-Driven Configuration**: Requires credentials to be injected via environment variables at execution time, preventing any hardcoding of secrets.

---

## 2. Injected Database Records

The script provisions only the bare operational entities required to authenticate against the Admin Dashboard:
* **Base Permissions**: Seeds 10 system RBAC permissions (e.g. `SUPER_ADMIN`, `OPERATIONS_MANAGER`, `FINANCE_MANAGER`, etc.).
* **Access Roles**: Seeds 8 conformed operational roles (e.g. `Super Admin`, `Operations Manager`, `Finance Manager`, etc.).
* **Staging User**: Creates exactly **one** system user representing the staging administrator, maps it to the `Super Admin` role, and flags the email and phone contexts as verified.

---

## 3. Required Environment Variables

To execute the seed successfully, ensure that the following variables are defined in the execution shell:

* `DATABASE_URL`: Staging PostgreSQL connection string (Railway internal/external URL).
* `STAGING_ADMIN_EMAIL`: Staging Super Admin login email address.
* `STAGING_ADMIN_PASSWORD`: Staging Super Admin password. **Must be a minimum of 12 characters in length.**

---

## 4. How to Run the Seed Safely

Once you have verified that database migrations have been successfully applied (`prisma migrate deploy`), run the staging seed command:

### Option A: Local Execution targeting Staging Database
Run this in your local terminal (never share your private `DATABASE_URL` or passwords in chat/logs):
```bash
DATABASE_URL="YOUR_STAGING_DATABASE_URL" \
STAGING_ADMIN_EMAIL="admin@rydalux.stage" \
STAGING_ADMIN_PASSWORD="YourSecureStagingPassword123!" \
corepack pnpm --filter @rydulux/api-services-local run seed:staging
```

### Option B: Remote Execution on Railway (PaaS Console)
1. Navigate to your **Railway API Service Dashboard** → **Variables** tab.
2. Add these variables:
   * `STAGING_ADMIN_EMAIL` = `admin@rydalux.stage`
   * `STAGING_ADMIN_PASSWORD` = `YourSecureStagingPassword123!`
3. Run a one-off execution container task or run it using Railway's terminal console:
   ```bash
   pnpm --filter @rydulux/api-services-local run seed:staging
   ```
4. Once completed, **remove the variables from the Railway Variables dashboard** to adhere to the zero-key retention security baseline.

---

## 5. Verification Checklist

After running the seed task:
- [ ] Confirm the terminal console prints:
  `Staging Admin RBAC permissions seeded successfully.`
  `Provisioning minimal Staging Super Admin user...`
  `Idempotent Staging Admin seeding completed successfully.`
- [ ] Go to your PostgreSQL database query console and verify the administrative user exists:
  ```sql
  SELECT email, "firstName", "lastName" FROM "User" WHERE email = 'admin@rydalux.stage';
  ```
- [ ] Navigate to `https://<STAGING_ADMIN_BASE_URL>/login` in your browser and verify you can successfully log in using these credentials.
