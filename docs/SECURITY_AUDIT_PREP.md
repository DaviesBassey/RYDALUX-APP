# RYDALUX Security Audit Preparation & Threat Model

This document serves as our comprehensive security posture overview, threat model assessment, and audit preparation runbook. It maps out threat surfaces across all business pillars—including logistics, billing, access control, and user safety—and outlines the controls implemented to secure our users and platforms.

---

## 1. Core Threat Surface Assessment

### 1.1 Threat Model Register

| Asset ID | Target Asset | Threat Vector | Likelihood | Impact | Current Mitigation | Remaining Gap | Priority |
|---|---|---|---|---|---|---|---|
| **AST-01** | Credit Card Data | Theft of card details via DB compromise. | Low | Critical | **Paystack Tokenization**: Raw card details are processed client-side. We store only secure gateway reference tokens. | None. Card info never touches backend. | High |
| **AST-02** | Shipment OTPs | Theft of raw OTPs leading to package theft. | Medium | High | **Bcrypt OTP Hashing**: We hash both pickup and delivery OTPs using bcrypt. Raw codes are never stored. | Rate-limiting OTP entry attempts. | High |
| **AST-03** | User Contact Info | Leaking recipient names/phones on unassigned jobs. | Medium | Medium | **Queue Scrubbing**: Unassigned available shipment queues have all recipient contact details scrubbed. | None. Enforced via safe response DTOs. | High |
| **AST-04** | Ledger Account | Retroactive alteration of ride commission ledgers. | Low | High | **Balanced Ledger Immutability**: Ledger entry models balance cash and platform earnings via balanced credits/debits. | Regular ledger checksum auditing. | Medium |
| **AST-05** | Support Notes | Users viewing internal staff safety audit annotations. | High | Medium | **Internal Note Masking**: Chat messages include the `isInternal` flag, which is strictly stripped from customer payloads. | None. Guarded via custom serializers. | Medium |
| **AST-06** | Payout Transfers | Suspicious high-value payout transfers to fraudulent bank accounts. | Low | Critical | **RBAC & Daily Caps**: Payout approvals are gated by the `FINANCE_MANAGER` role, and cool-down limits are enforced. | Multi-admin approval signatures. | High |
| **AST-07** | Safety Reports | Unauthorized access to SOS incident telemetry records. | Low | High | **Safety Role Gating**: Reviewing safety timelines or SOS events requires strict `SAFETY_OFFICER` permissions. | None. Guarded via role guards. | High |

---

## 2. Security Audit Checklist & Controls

We have implemented the following core security controls across our software architectures:

- [x] **No Raw Credit Card Storage**: The platform does not store or process raw credit cards or CVV numbers. We leverage Paystack client-side tokenization and gateway billing.
- [x] **No Raw OTP Storage**: Double-blind pickup and delivery OTPs are matched exclusively as secure bcrypt hashes, preventing database-level leakage of active package release codes.
- [x] **No OTP Hash Exposure**: Access control layers scrub the `pickupOtpHash` and `deliveryOtpHash` fields from all rider, driver, and public API responses.
- [x] **Secure Webhook Verification**: Our Paystack webhook handler validates signature hashes (`X-Paystack-Signature`) matching the gateway secret to reject spoofed payment requests.
- [x] **Payment & Payout Idempotency**: Payment collection and payout approvals employ strict unique key scopes (`scope: key`) in the database to prevent duplicate processing.
- [x] **Admin RBAC Enforcement**: Administrative controllers utilize dedicated guards (`@UseGuards(JwtAuthGuard, PermissionsGuard)`) checking conformed staff permission mappings.
- [x] **Driver Shipment Feed Scrubbing**: The available shipments grid visible to unassigned drivers hides the `recipientName` and `recipientPhone` fields to prevent data scraping.
- [x] **Support Chat Isolation**: Internal notes logged on support tickets are tagged `isInternal: true` and are omitted from all customer-facing API responses.
- [x] **Administrative Write Auditing**: Every admin write action generates an `AuditLog` entry detailing the actor's ID, action type, entity, and state changes.
- [x] **Immutable Ledger Entries**: Double-entry ledger entries are read-only and balance debits against credits. Adjustments must be posted as new reversing entries.
- [x] **Incident Timeline Permission Gating**: Accessing detailed safety SOS records or check-in telemetry is restricted to conformed `SAFETY_OFFICER` and `SUPER_ADMIN` accounts.

---

## 3. Environment & Secret Management Policy

1. **Env Git Ignored**: All local `.env` and `.env.local` files are strictly registered inside `.gitignore` to prevent secret leakage.
2. **Placeholder-Only Examples**: Only template files (`.env.example` and `.env.staging.example`) are tracked, containing generic dummy placeholders only.
3. **No Hardcoded Keys**: No API secrets, database passwords, or JWT keys are hardcoded in the codebase.
4. **Strong JWT Signatures**: JWT access and refresh secrets in staging/production must use cryptographically secure 256-bit random strings.
5. **Secure Staging Vaults**: Secrets are injected directly via secure container environment managers in staging/production environments.

---

## 4. Security Incident Response Playbook

### 4.1 Leaked API / Gateway Secret Key
1. **Immediate Revocation**: Generate and rotate the Paystack or Twilio secret key instantly inside the provider portal.
2. **Update Environment**: Replace the leaked environment variable inside the Staging/Production deployment configuration vaults.
3. **Trigger Redeployment**: Perform a zero-downtime rolling restart of the API gateway containers to load the rotated key.
4. **Log Analysis**: Review gateway logs to check if any unauthorized requests successfully bypassed authentication during the exposure window.

### 4.2 Spoofed Webhook / Payment Abuse
1. **Webhook Key Rotation**: Instantly rotate the Paystack webhook verification secret.
2. **Re-Verification**: Verify that subsequent webhooks are rejected with a `401 Unauthorized` status unless the new signature is set.
3. **Audit Imbalances**: Audit recent financial transaction logs and ledger entries to check for mismatch alerts. Reconcile any duplicate transactions manually.

### 4.3 Administrative Account Compromise
1. **Session Revocation**: Run `/auth/logout-all` targeting the compromised Admin `userId` to delete all active database refresh tokens instantly.
2. **Disable User Account**: Transition `AdminUser.isActive` to `false` in the database to reject subsequent API handshakes.
3. **Audit administrative Actions**: Check `AuditLog` records created by the actor ID to identify any unauthorized edits, payout approvals, or status overrides.

### 4.4 Suspicious High-Value Payout Trigger
1. **Halt Processing**: Mark the payout request status as `REJECTED` in the database before the transfer completes.
2. **Enforce Cooldown**: Apply a strict payout lock cooldown on the Driver's Profile (`payoutAccountCooldownUntil`).
3. **Investigate Bank Registry**: Audit recent bank account registry updates and matching ledger entries to check for fraud.

---

## 5. Security Go/No-Go Release Criteria

### 5.1 Must-Pass Before Staging
* **Compilation Safety**:monorepo must compile cleanly (`turbo run build` successful).
* **Test Suite execution**: All 236 unit tests pass.
* **Ignored Secrets**: Verify no actual credentials are committed.
* **Cryptographic Matching**: pickup/delivery OTPs matched exclusively via bcrypt.

### 5.2 Must-Pass Before Public Beta
* **Secure Webhook Verification**: Verify webhooks validate cryptographic gateway signatures.
* **Storage bucket ACLs**: S3/MinIO bucket access permissions restricted to signed URL requests.
* **RBAC validation**: Verify that normal users cannot query administrative endpoints.

### 5.3 Can Defer Until Production
* **Third-Party Penetration Auditing**: Enroll external cybersecurity experts to execute manual penetration testing.
* **Intrusion Detection Systems**: Deploy advanced intrusion detection systems (e.g. AWS GuardDuty or Cloudflare WAF) on staging/production routing endpoints.
