# RYDALUX Release Checklist & Executive Sign-off

This master release checklist serves as the final gateway before deploying any build branch to Staging or Production. It aggregates verification items from staging setups, QA audits, security controls, and rollback preparations.

---

## 1. Staging Deployment Checklist
- [ ] **Docker Containers**: Verify Postgres, Redis, and MinIO are active and healthy.
- [ ] **PostGIS Extension**: Verify spatial extensions are active on the database.
- [ ] **Prisma schema sync**: Run `migrate deploy` and confirm all 11 database schema changes apply successfully.
- [ ] **Administrative Users**: Verify that Super Admin, Support Agent, Finance Manager, and Safety Officer accounts are seeded in the database.
- [ ] **Staging Env Variables**: Confirm environment variables are populated with staging test mode keys only.
- [ ] **API Gateway probe**: Verify `GET /health/ready` returns `200 OK` with database/redis up indicators.
- [ ] **Web Admin deployment**: Confirm Next.js compiles and hosts `/login` endpoint.
- [ ] **Expo Mobile metro**: Confirm Expo Metro bundler initializes.

---

## 2. QA Manual Verification Checklist
- [ ] **Super Admin Dashboard**: Verify that users, trips, payments, ledgers, and audit logs are fully loaded and auditable.
- [ ] **Rider shipment flow**: Book coordinate specs, describe package, check weight surges, generate quotes, and reviewdouble-blind OTP timeline matching.
- [ ] **Driver shipment flow**: Available unassigned shipment feeds must hide sensitive recipient information. Accepting a shipment must successfully prompt pickup/delivery double-blind OTP matching.
- [ ] **Safety Sos event**: Trigger Panic SOS alert, verify real-time safety dashboard notifications, log safety audit notes, and resolve incident status.
- [ ] **Customer support desk**: Create support ticket, verify messages are delivered, confirm internal notes remain hidden, and resolve ticket.
- [ ] **Balanced ledger Audit**: Verify that captured payments debit cash assets and credit driver payables/platform revenue, with ledger entry credits balancing debits.

---

## 3. Security Audit Checklist
- [ ] **No card storage**: Verify Paystack client-side tokenization is employed. No credit card or CVV details stored.
- [ ] **Hashed OTP records**: pickup and delivery double-blind OTPs are verified exclusively via bcrypt hashes.
- [ ] **No OTP hash leakage**: Ensure response shapes strip all raw OTPs, OTP hashes, and unassigned recipient contact details.
- [ ] **RBAC authorization**: Verify admin routes require strict staff authorization guards.
- [ ] **Internal logs isolation**: Confirm support messaging hides internal annotations from client views.
- [ ] **Administrative audit trail**: Confirm every write action generates an `AuditLog` entry detailing the payload changes.
- [ ] **Balanced ledger immutability**: Verify that ledgers are write-once, with modifications posted as new adjusting entries.

---

## 4. Rollback Readiness Checklist
- [ ] **Database Pre-Migration Backup**: Execute a full DB database backup immediately prior to applying migrations.
- [ ] **API image tags rollback**: Verify the staging rolling container image deployment can revert to a previous tag immediately if health checks fail.
- [ ] **Static assets rollover**: Ensure next/expo hosting platforms support instant rollover.
- [ ] **Config Flag Hotfixes**: Confirm that risky or incomplete modules (e.g. Schedulers or cellular SMS dispatch) can be toggled off at runtime using environment properties.

---

## 5. Executive Sign-off & Releases Gate

Verify that the following sign-off metrics are met prior to staging promotion and beta branch merges:

| Gate | Criterion | Responsible | Status |
|------|-----------|-------------|--------|
| **API Build** | Compile clean exit code 0 (`nest build`) | Backend Lead | [ ] |
| **API Tests** | 236 assertions pass successfully | QA Lead | [ ] |
| **Admin Web Build** | Production NextJS bundle compiles | Frontend Lead | [ ] |
| **Mobile TypeScript**| Zero compile typecheck warnings/errors | Mobile Lead | [ ] |
| **Idempotency Seed** | Seeding script executes without database errors | Devops Lead | [ ] |
| **Security Audit** | Verified no actual credentials are committed | Security Lead | [ ] |

---

### Releases Sign-off
* **Lead Architect Sign-off**: _______________________ Date: ____________
* **Product Manager Sign-off**: _______________________ Date: ____________
* **QA & Security Lead Sign-off**: _______________________ Date: ____________
