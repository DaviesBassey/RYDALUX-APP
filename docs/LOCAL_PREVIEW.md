# RYDALUX Local Development Preview & QA Guide

This guide describes how to run and test the complete RYDALUX ecosystem locally. By utilizing our pre-configured local Docker services, database migrations, and development seed data, you can log in as a Rider, Driver, or Admin and run through complete operational workflows.

---

## 1. Prerequisites

Ensure you have the following installed on your machine:
* **Node.js**: `v20.x` or later
* **PNPM**: `v9.x`
* **Docker & Docker Compose**: For running PostgreSQL (with PostGIS), Redis, and MinIO.

---

## 2. Environment Configuration

Copy the example environment file to the root:
```bash
cp .env.example .env
```

Your root `.env` should contain the following development-ready variables:
```env
NODE_ENV=development
PORT=4000

# PostgreSQL + PostGIS (Docker Container local port)
DATABASE_URL=postgresql://rydalux:local_prod_password@localhost:5432/rydalux

# Cache / Queue
REDIS_URL=redis://localhost:6379

# JWT Secrets (safe placeholder keys)
JWT_ACCESS_SECRET=replace-with-secure-random-string-min-32-chars-locally
JWT_REFRESH_SECRET=replace-with-secure-random-string-min-32-chars-locally

# First Super Admin Setup
ADMIN_EMAIL=admin@rydalux.local
ADMIN_PASSWORD=LocalAdminPass123!

# SMS / Payment Providers
SMS_PROVIDER=none
PAYSTACK_SECRET_KEY=local_paystack_secret_minimum_32_characters
PAYSTACK_WEBHOOK_SECRET=local_webhook_secret_minimum_32_characters

# Local Ports
NEXTAUTH_URL=http://localhost:3000
API_URL=http://localhost:4000
```

---

## 3. Quickstart: 1-Click Local Setup

We have configured simple helper scripts inside the root `package.json` to manage the environment:

### Step 1: Initialize the Database (Docker, Migrate & Seed)
Run this single command to start Postgres/Redis, apply schema migrations, and populate QA sample data:
```bash
pnpm db:setup
```

### Step 2: Spin Up the Services
Open separate terminal tabs and launch the components:

* **Tab 1: NestJS API Service (Backend)**
  ```bash
  pnpm start:api
  ```
* **Tab 2: Next.js Admin Dashboard (Web)**
  ```bash
  pnpm start:admin
  ```
* **Tab 3: React Native Expo Mobile App**
  ```bash
  pnpm start:mobile
  ```

---

## 4. Local Port Mappings & Services

| Service | Address / URL | Description | Default Credentials |
|---------|---------------|-------------|---------------------|
| **NestJS API** | `http://localhost:4000` | Core API Gateway & Services | - |
| **Admin Web App** | `http://localhost:3000` | Administration Dashboard | See "Pre-seeded Credentials" below |
| **PostgreSQL** | `localhost:5432` | Relational DB + PostGIS | `rydalux` / `local_prod_password` |
| **Redis** | `localhost:6379` | Cache & Job Queues | - |
| **MinIO Console** | `http://localhost:9000` | Mock S3 File Attachment Store | `minioadmin` / `minioadmin` |

---

## 5. Pre-seeded QA Test Credentials

All pre-seeded test accounts use the default development password:
**`LocalAdminPass123!`**

### Administrative & Operations Portals (Web Admin)
* **Super Admin**: `admin@rydalux.local` (Unrestricted RBAC, audit logs, billing overrides)
* **Support Agent**: `support@rydalux.local` (Manage complaints, tickets, incident reports)
* **Finance Manager**: `finance@rydalux.local` (Review ledgers, approve payout transfers)
* **Safety Officer**: `safety@rydalux.local` (Investigate SOS events, reviews distress timelines)

### Mobile Applications (Rider / Driver Screens)
* **Sample Rider (Customer)**: `rider@rydalux.local` (Book rides, request shipments, pay, view timelines)
* **Approved Driver**: `driver.approved@rydalux.local` (Online status, active vehicle attached, accepts quotes/OTPs)
* **Pending Driver**: `driver.pending@rydalux.local` (Offline, onboarding incomplete, inactive vehicle)

---

## 6. QA Manual Verification Checklist

Once the services are running, run through this checklist to verify that all systems are operational:

### 1. Web Admin Dashboard Checklist
- [ ] **Login**: Visit `http://localhost:3000/login`, log in with `admin@rydalux.local`.
- [ ] **Dashboard Overview**: Check stats on active rides, financials, and live maps.
- [ ] **Driver Registry**: Go to `/dashboard/drivers` and verify that `David Approved` (ACTIVE) and `Paul Pending` (INACTIVE) are populated.
- [ ] **Trip Logs**: Go to `/dashboard/trips` and view the historical record for `TRIP-COMPLETED-001`.
- [ ] **Payments Registry**: Visit `/dashboard/payments` and verify that the `7,500 NGN` captured payment for Trip 1 is visible.
- [ ] **Payout Transfers**: Visit `/dashboard/payouts` and verify the `15,000 NGN` paid payout and the `5,000 NGN` requested payout.
- [ ] **Support Desk**: Go to `/dashboard/support` and view the resolved safety concern ticket with its full chat history.
- [ ] **Safety & SOS Centre**: Go to `/dashboard/safety` to review the resolved panic distress SOS event for Trip 1.
- [ ] **Shipment Control Grid**: Go to `/dashboard/shipments` and verify that `Alice Smith` (Delivered) and `Bob Johnson` (Requested) are listed with their categories and status.

### 2. Mobile App Checklist
- [ ] **Launch Expo**: Start the mobile server and open it via simulator/Expo Go.
- [ ] **Rider shipment UI booking**:
  - Open Rider shipment module.
  - Fill in coordinate inputs, item category, weight, and recipient name/phone.
  - Generate quote and verify that the fare quotes are computed and display surge fees.
- [ ] **Double-Blind OTP flow**:
  - Select active tracking and verify that secure double-blind pickup/delivery OTP inputs are exposed.
  - Verify that raw OTP values are masked and only verified via strict bcrypt hash matching.
- [ ] **Driver active shipment control**:
  - Accept unassigned shipment tasks.
  - Transition shipment states from Pickup $\rightarrow$ transit $\rightarrow$ deliver.
  - Confirm delivery with signature proof uploads.

---

## 7. Troubleshooting & Common Pitfalls

### Docker Container Fails to Start
* **Symptoms**: `port 5432 already in use` or container crashes.
* **Fix**: Ensure no local PostgreSQL service is running on your host machine:
  ```bash
  sudo pg_ctl -D /usr/local/var/postgres stop
  # or on macOS:
  brew services stop postgresql
  ```

### Database Migration Out of Sync (Drift)
* **Symptoms**: Prisma errors like `Relation "User" does not exist` or `Column not found`.
* **Fix**: Force-apply migrations and re-seed the local schema:
  ```bash
  pnpm db:stop
  pnpm db:setup
  ```

### Geolocation PostGIS Unsupported Column Types
* **Symptoms**: Prisma throws errors regarding the `Unsupported("geography(Point,4326)")` types.
* **Fix**: Ensure your Postgres container uses the `postgis/postgis:15-3.4` image (configured in our default `docker-compose.yml`) which includes the spatial extension libraries.
