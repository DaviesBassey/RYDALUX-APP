# RYDALUX QA Audit & Beta Readiness Checklist

**Release Manager Summary**: The RYDALUX platform has reached operational stability for local development and QA previewing. The backend API is conformed, all 236 unit tests pass, and both the React Native Mobile App (TypeScript compile) and Next.js Web Admin compile successfully with zero errors. All core modules—including Rider/Driver onboarding, Ride dispatch, Safety centers, Support desks, double-entry Ledgers, and the new Shipment lifecycle—are verified. This document outlines our manual QA verification areas, technical readiness metrics, security audit checklist, beta launch checklist, risk register, and the Go/No-Go criteria required before staging deployment and public beta launch.

---

## 1. QA Manual Verification Checklist

Once services are running locally, the QA team should execute the following test scripts to verify the core operational loops:

### 1.1 Web Admin Dashboard Operations
- [ ] **Admin Authentication**: Verify login at `/login` using `admin@rydalux.local` with correct session cookie storage and device fingerprint tracking.
- [ ] **Rider & Driver Accounts**: Auditing Rider listings and verifying that the KYC status update rules apply (Pending $\rightarrow$ Submitted $\rightarrow$ Approved/Rejected).
- [ ] **Vehicle Auditing**: Verify that vehicle entries can be reviewed and transitioned from `INACTIVE` to `ACTIVE` by a user with the Operations Manager or Super Admin role.
- [ ] **Trip Monitoring**: Verify that all historical and active trip details are visible, including live tracking maps (mocked) and timeline events.
- [ ] **Shipment Control Grid**: Access `/dashboard/shipments`, audit sender details, verify recipient info masking, review driver/vehicle allocations, and check tracking events.
- [ ] **Distress & Safety Centre**: Review SOS Panic timeline records, test the administrative call-back notes logging, and verify SOS transition status overrides (Open $\rightarrow$ Acknowledged $\rightarrow$ Escalated $\rightarrow$ Resolved).
- [ ] **Support Desk**: Audit active tickets, test internal admin-only chat notes, send replies, and verify status transitions.
- [ ] **Billing & Ledger Audit**: Verify that captured payments translate to balanced ledger transactions, audit system accounts, and review paid/requested payout transfers.
- [ ] **Audit Trail logs**: Audit `/dashboard/audit-logs` and verify that every administrative action (KYC update, payout approval, shipment status override) creates an `AuditLog` entry detailing the actor and payload.

### 1.2 Rider Mobile App Workflows
- [ ] **Rider Login**: Enter rider credentials, verify OTP verification gateway placeholder, and check token refresh handlers.
- [ ] **Ride Request Booking**: Pin pickup/dropoff on the map, generate fare quote, select payment method, and dispatch ride request.
- [ ] **Shipment Logistics Wizard**: 
  - Fill in coordinate inputs (pickup/dropoff), describe package, select weight class/category, and set priority.
  - Review quote itemizations (base fare, weight surge, total cost) and book the shipment.
- [ ] **Double-Blind Tracking**: Confirm that the secure double-blind pickup and delivery 6-digit OTPs are exposed only when the shipment enters corresponding states.
- [ ] **Distress SOS Call**: Trigger the in-ride distress button, verify that coordinates are captured, and confirm an active SOS incident report is launched.

### 1.3 Driver Mobile App Workflows
- [ ] **Driver Authentication**: Log in as approved driver, transition profile status to `AVAILABLE` (online grid), and verify that active vehicle is attached.
- [ ] **Trip dispatch accept**: Accept incoming ride request, view map directions, verify Trip PIN code to begin transit, and complete the ride.
- [ ] **Logistics shipment accept**:
  - Access the available shipments grid and verify that recipient phone numbers and contact names are scrubbed/hidden before assignment.
  - Accept shipment task and transition statuses: Arrive Pickup $\rightarrow$ Verify Pickup OTP $\rightarrow$ Transit package $\rightarrow$ Arrive Delivery $\rightarrow$ Verify Delivery OTP $\rightarrow$ Upload Signature Proof $\rightarrow$ Complete.

---

## 2. Technical Readiness Checklist

| Category | Component | Stated Requirement | Local Status | Staging Action Needed |
|----------|-----------|--------------------|--------------|-----------------------|
| **Core API** | NestJS Service | Compile with zero errors | **Pass** (`nest build`) | None. |
| **Unit Tests** | Jest test suite | 236/236 conformed assertions passing | **Pass** (19 passed, 19 total) | Run unit tests on CI/CD pipelines. |
| **Web Admin** | Next.js Web App | Production build compilation | **Pass** (`next build`) | None. |
| **Mobile App** | Expo/React Native | Strict TypeScript typecheck | **Pass** (`tsc --noEmit` clean) | Package staging build bundle. |
| **Database** | Prisma Schema | Apply all migrations dev/deploy | **Pass** (11 migrations conformed) | Run `prisma migrate deploy` on target DB. |
| **Local Seeding**| Prisma Seed | 100% idempotent seed execution | **Pass** (Idempotent seed run ok) | Seed minimal configuration items only. |
| **Environment** | Dotenv Config | Valid API/Auth variables | **Pass** (Conformed root `.env`) | Swap out local placeholders for staging keys. |
| **Integration** | DB Integration Tests | Database-dependent test execution | **Ready** (Separate configuration) | Configure staging test DB in CI/CD pipeline. |

---

## 3. Security Audit Checklist

- [x] **No Raw Credit Card Data**: All customer payments are processed strictly via secure tokenized gateways (Paystack tokenization). Raw card details never touch our servers.
- [x] **No Raw OTP Storage**: High-security double-blind OTP codes (pickup/delivery OTPs) are stored and matched exclusively as secure bcrypt hashes.
- [x] **No OTP Hash Exposure**: Access tokens and API responses shape models safely, stripping all `pickupOtpHash`, `deliveryOtpHash`, and recipient credentials from available queues.
- [x] **Signed URL Placeholders**: Dynamic uploads (onboarding docs, signature photos) use secure mock signed URLs, restricting access to authorized actors.
- [x] **RBAC on Admin Routes**: Administrative controllers employ rigorous permission guards (`@UseGuards(JwtAuthGuard, PermissionsGuard)`), validating tokens against conformed staff roles.
- [x] **Driver Shipment Queue Scrubbing**: Available shipment feeds visible to unassigned drivers have all recipient contact details (names, phone numbers) scrubbed to prevent double-blind data leaks.
- [x] **Support Internal Notes Hidden**: Support ticket messaging structures flag `isInternal` notes, hiding internal investigations from client-facing API responses.
- [x] **Audit Logging**: Any write action performed by an administrator generates a structured `AuditLog` entry capturing target, payload, and the actor's ID.
- [x] **Payout Approval Controls**: Approving payout requests requires explicit `FINANCE_MANAGER` or `SUPER_ADMIN` permissions and enforces daily limit bounds.
- [x] **Safety Incident Access**: Reviewing SOS event details, safety check-in logs, and accident incident reports is restricted exclusively to conformed `SAFETY_OFFICER` and `SUPER_ADMIN` accounts.

---

## 4. Beta Launch & Staging Checklist

Execute these steps in order when moving the codebase to the Staging Environment:

### 4.1 Infrastructure Provisioning
1. **Provision Staging Servers**: Setup target virtual machines or containers (e.g. AWS ECS, Heroku, or GCP) for the API gateway and Admin dashboard.
2. **Provision Staging Database**: Deploy PostgreSQL with PostGIS extension enabled.
3. **Provision Cache & File Storage**: Setup staging Redis cluster and a secure Amazon S3 (or equivalent storage bucket) for uploading driver onboarding files and shipment proof signature photos.

### 4.2 Application Configuration
1. **Configure Environment Secrets**: Setup target staging environment variables. Swap mock keys with Paystack test secret keys, Twilio/Africa's Talking test SMS keys, and secure JWT access/refresh secrets.
2. **Apply Migrations**: Execute the Prisma migration command to deploy the conformed schema:
   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```
3. **Seed Configurations**: Run a minimal seed script populating permissions, base admin roles, and default administrative logins.

### 4.3 Smoke Testing & Onboarding
1. **Run Smoke Tests**: Execute direct health checks against the staging endpoint (`GET /health`).
2. **Onboard Test Users**:
   * Create 5 conformed driver profiles and upload fake KYC documents.
   * Approve documents via the Admin panel.
   * Create 20 test rider profiles.
3. **Operational End-to-End Tests**:
   * Execute 10 complete ride booking tests (Request ride $\rightarrow$ assign driver $\rightarrow$ accept $\rightarrow$ verify PIN $\rightarrow$ transit $\rightarrow$ complete).
   * Execute 5 complete shipment logistics tests (Book quote $\rightarrow$ assign driver $\rightarrow$ pickup OTP match $\rightarrow$ transit $\rightarrow$ delivery OTP match $\rightarrow$ upload signature proof $\rightarrow$ complete).
   * Test Safety Check-In prompts, trigger SOS distress panic button, and resolve ticket issues inside the support desk.
   * Request payout from the driver app, approve the transfer via the Admin panel, and confirm balanced ledger entries are recorded.

---

## 5. Risk Register

| Risk ID | Description | Impact | Likelihood | Mitigation Strategy |
|---------|-------------|--------|------------|---------------------|
| **RSK-01** | Integration tests require real Postgres DB. | Medium | High | Isolated integration tests under `test/integration/` utilizing `jest-integration.json` to prevent local test runs from interfering with CI unit test suites. |
| **RSK-02** | Shipment uploads currently use placeholder logic. | Low | Medium | Configured secure mock signed upload URL interfaces, ensuring seamless transition when S3 storage buckets are wired. |
| **RSK-03** | Real map routing is mocked. | High | Low | Map directions use linear distance routing for development preview. Mapbox or Google Maps SDK will be integrated in subsequent phases. |
| **RSK-04** | Live Paystack transaction webhook dependency. | Medium | Medium | Implemented a dedicated local `PaystackController` webhook parser with manual event retry triggers to test transaction approvals. |
| **RSK-05** | Real SMS provider not active. | Medium | Low | Configured `SMS_PROVIDER=none` to gracefully bypass SMS dispatch locally, printing raw OTP values to console logs for testing. |

---

## 6. Go/No-Go Release Criteria

### 6.1 Must-Have Before Staging
* **API Compilation**: Clean exit code 0 (`nest build` passes successfully).
* **Test Suite passes**: All 236 unit tests pass.
* **Admin dashboard Compilation**: Clean Next.js compilation.
* **Mobile TypeScript Compile**: 0 compilation warnings and 0 type errors.
* **Prisma schema sync**: Local Postgres fully synchronized.
* **Security guards conformed**: Cryptography services matching OTP hashes using bcrypt strictly.

### 6.2 Must-Have Before Public Beta
* **Storage bucket integration**: Real S3/MinIO bucket wired up for KYC/proof photos uploads.
* **Real SMS dispatch**: Wiring up Twilio or Africa's Talking SMS API with secure keys.
* **Real map routing**: Google Maps or Mapbox SDK integrated for accurate mileage fare calculations.
* **Payment webhook setup**: Verified Paystack webhook signatures matching provider keys.

### 6.3 Can Defer Until Post-Beta
* **Advanced geofencing rules**: Complex zone pricing adjustments.
* **Platform multi-currency support**: Supporting local currency conversion dynamically.
* **App Store & Play Store Submissions**: Enrolling driver and rider apps into Apple TestFlight and Google Play Console closed tracks.
