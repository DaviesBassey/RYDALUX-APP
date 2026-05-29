# Driver Payouts System - Section 17

## Overview

The RYDALUX driver payouts system enables drivers to securely request payments for completed work, with finance manager approval and double-entry ledger accounting for financial integrity. Built on the hardened ledger from Section 16, every payout approval creates balanced ledger transactions.

## Architecture

### Core Flow

```
Driver adds bank account (24h cooldown) 
    ↓
Driver requests payout (if eligible)
    ↓
Payout status: REQUESTED
    ↓
Finance manager approves/rejects
    ↓
Approval → APPROVED status + ledger transaction (DEBIT DRIVER_PAYABLE, CREDIT PAYOUT_CLEARING)
Rejection → REJECTED status + audit log
    ↓
Admin marks APPROVED → PROCESSING
    ↓
Admin marks PROCESSING → PAID or FAILED
    ↓
Failure → Reversal ledger transaction (balances moved back)
```

## Payout Account Management

### Adding/Updating Payout Account

**Endpoint:** `POST /drivers/payout-account`

**Request:**
```json
{
  "bankCode": "GT",
  "bankName": "Guaranty Trust Bank",
  "accountName": "John Doe",
  "accountNumber": "0123456789",
  "accountHolderName": "John Doe"
}
```

**Response:**
```json
{
  "id": "ba-uuid",
  "bankCode": "GT",
  "bankName": "Guaranty Trust Bank",
  "accountName": "John Doe",
  "accountNumberLast4": "6789",
  "verifiedAt": "2026-05-29T07:15:00Z",
  "reAuthRequiredAt": "2026-06-28T07:15:00Z",
  "cooldownUntil": "2026-05-30T07:15:00Z"
}
```

**Behavior:**
- Creates or updates driver's bank account
- Sets `verifiedAt` to current timestamp (marks as verified)
- Sets `reAuthRequiredAt` to 30 days from now (placeholder for future re-auth requirement)
- Sets driver's `payoutAccountCooldownUntil` to 24 hours from now
- Creates `PAYOUT_ACCOUNT_ADDED` audit log

### Payout Account Constraints

1. **One per driver**: Unique on `driverProfileId`
2. **Verification placeholder**: `verifiedAt` field for future KYC verification
3. **Re-auth placeholder**: `reAuthRequiredAt` field (not enforced yet, stored for frontend)
4. **Cooldown enforcement**: 24-hour cooldown after account change before requesting payout

### Retrieving Payout Account

**Endpoint:** `GET /drivers/payout-account`

**Response:**
```json
{
  "id": "ba-uuid",
  "bankCode": "GT",
  "bankName": "Guaranty Trust Bank",
  "accountName": "John Doe",
  "accountNumberLast4": "6789",
  "verifiedAt": "2026-05-29T07:15:00Z",
  "reAuthRequiredAt": "2026-06-28T07:15:00Z",
  "cooldownUntil": null
}
```

## Payout Requests

### Requesting a Payout

**Endpoint:** `POST /drivers/payouts/request`

**Request:**
```json
{
  "amount": "5000.00",
  "reason": "Trip earnings for May"
}
```

**Response:**
```json
{
  "id": "po-uuid",
  "amount": "5000.00",
  "currency": "NGN",
  "status": "REQUESTED",
  "requestedAt": "2026-05-29T07:15:00Z",
  "approvedAt": null,
  "rejectedAt": null,
  "rejectionReason": null
}
```

### Eligibility Checks

Payout requests are rejected if:

1. **Driver not KYC approved**: Status must be `APPROVED` in latest `KycCheck`
2. **No payout account**: Bank account must exist and have `verifiedAt` timestamp
3. **Cooldown active**: Current time must be > `payoutAccountCooldownUntil`
4. **Amount below minimum**: Must be >= 1000 NGN (100,000 minor units)
5. **Insufficient balance**: Available balance in `DRIVER_PAYABLE` account must be >= requested amount

### Retrieving Payout History

**Endpoint:** `GET /drivers/payouts?limit=20&offset=0`

**Response:**
```json
{
  "payouts": [
    {
      "id": "po-uuid",
      "amount": "5000.00",
      "currency": "NGN",
      "status": "APPROVED",
      "requestedAt": "2026-05-29T07:15:00Z",
      "approvedAt": "2026-05-29T07:20:00Z",
      "rejectedAt": null,
      "processedAt": null,
      "failedAt": null,
      "rejectionReason": null
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### Checking Payout Balance

**Endpoint:** `GET /drivers/payouts/balance`

**Response:**
```json
{
  "balance": "50000.00"
}
```

Returns the current available balance from the `DRIVER_PAYABLE` ledger account.

## Finance Manager Operations

### Viewing Payout Requests

**Endpoint:** `GET /admin/payouts/requests?status=REQUESTED&limit=20&offset=0`

**Response:**
```json
{
  "payouts": [
    {
      "id": "po-uuid",
      "driverId": "driver-uuid",
      "driverName": "John Doe",
      "amount": "5000.00",
      "currency": "NGN",
      "status": "REQUESTED",
      "requestedAt": "2026-05-29T07:15:00Z",
      "approvedAt": null,
      "rejectionReason": null
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### Approving a Payout

**Endpoint:** `POST /admin/payouts/:id/approve-section17`

**Request:**
```json
{
  "comment": "Verified account details"
}
```

**Response:** Updated payout object with status `APPROVED`

**Ledger Entries Created:**
- **DEBIT `DRIVER_PAYABLE`**: Reduces driver liability
- **CREDIT `PAYOUT_CLEARING`**: Increases payout clearing liability
- **Reference:** `payout:{payoutId}:approved:driver-payable` and `payout:{payoutId}:approved:payout-clearing`
- **Validation:** Total debits must equal total credits

**Idempotency:**
- Uses reference `payout:{payoutId}:approved` for idempotency check
- Duplicate approvals return existing payout without creating duplicate ledger entries

**Audit Log:**
- Action: `PAYOUT_APPROVED`
- Entity: `PAYOUT`
- Payload: `{amount, comment}`

### Rejecting a Payout

**Endpoint:** `POST /admin/payouts/:id/reject`

**Request:**
```json
{
  "reason": "Invalid bank account details"
}
```

**Response:** Updated payout object with status `REJECTED`

**Constraints:**
- Reason is required (non-empty string)
- Can only reject `REQUESTED` payouts

**Audit Log:**
- Action: `PAYOUT_REJECTED`
- Entity: `PAYOUT`
- Payload: `{amount, reason}`

### Marking Processing

**Endpoint:** `POST /admin/payouts/:id/processing`

**Response:** Updated payout object with status `PROCESSING`

**Constraints:**
- Can only mark `APPROVED` payouts as `PROCESSING`
- Sets `transferInitiatedAt` timestamp

### Marking Paid

**Endpoint:** `POST /admin/payouts/:id/paid`

**Request:**
```json
{
  "providerReference": "TRF-123456"
}
```

**Response:** Updated payout object with status `PAID`

**Constraints:**
- Can only mark `PROCESSING` payouts as `PAID`
- Sets `processedAt` timestamp
- Updates `providerReference` if provided

### Marking Failed

**Endpoint:** `POST /admin/payouts/:id/failed`

**Request:**
```json
{
  "reason": "Bank account closed"
}
```

**Response:** Updated payout object with status `FAILED`

**Ledger Reversal:**
When payout fails, creates reversal ledger entries:
- **CREDIT `DRIVER_PAYABLE`**: Restores driver liability (opposite of approval)
- **DEBIT `PAYOUT_CLEARING`**: Reduces payout clearing (opposite of approval)
- Maintains balance: total debits = total credits

**Audit Log:**
- Action: `PAYOUT_FAILED`
- Entity: `PAYOUT`
- Payload: `{status, reason}`

## Payout Statuses

| Status | Description | Can Transition To |
|--------|-------------|------------------|
| `REQUESTED` | Driver requested payout | `APPROVED`, `REJECTED`, `CANCELLED` |
| `APPROVED` | Finance manager approved, ledger created | `PROCESSING`, `REJECTED` |
| `PROCESSING` | Transfer initiated with provider | `PAID`, `FAILED` |
| `PAID` | Transfer completed successfully | (terminal) |
| `FAILED` | Transfer failed, reversal created | (can retry as new request) |
| `REJECTED` | Finance manager rejected request | (terminal) |
| `CANCELLED` | Payout cancelled (not implemented yet) | (terminal) |

## Ledger Accounts

### DRIVER_PAYABLE (Liability)

- **Code:** `platform:driver_payable:NGN`
- **Type:** LIABILITY
- **Debit events:** When payout approved (move from payable to clearing)
- **Credit events:** When payout fails (move back from clearing to payable)
- **Balance meaning:** Amount owed to all drivers

### PAYOUT_CLEARING (Liability)

- **Code:** `platform:payout_clearing:NGN`
- **Type:** LIABILITY
- **Credit events:** When payout approved (payouts in transit)
- **Debit events:** When payout fails (return from clearing)
- **Balance meaning:** Payouts in transit to payment provider

## RBAC

### Permission Requirements

- **Driver operations:** No additional permission (implicit via authenticated driver)
  - Add payout account
  - Request payout
  - View own payouts and balance

- **Finance manager operations:** Requires `FINANCE_MANAGER` permission
  - Approve payouts
  - Reject payouts
  - Mark processing/paid/failed
  - View payout requests

### Role Mapping

Only users with `FINANCE_MANAGER` permission can approve/reject payouts:
- Super Admin: ✓ Can approve
- Finance Manager: ✓ Can approve
- Operations Manager: ✗ Cannot approve
- Support Agent: ✗ Cannot approve
- Read-Only Auditor: ✗ Cannot approve

## Audit Logging

Every payout state change creates an audit log entry:

```
Table: AuditLog
- actorId: User ID (driver for request, admin for approval)
- action: PAYOUT_REQUESTED, PAYOUT_APPROVED, PAYOUT_REJECTED, PAYOUT_FAILED, PAYOUT_ACCOUNT_ADDED
- entity: PAYOUT or PAYOUT_ACCOUNT
- entityId: Payout or account ID
- payload: {amount, reason, comment, bankCode, etc.}
- createdAt: Auto timestamp
```

## Idempotency

### Payout Requests

Uses driver ID + request time uniqueness (driver can submit multiple requests).

### Payout Approvals

Uses reference `payout:{payoutId}:approved`:
- Check if `FinancialTransaction` with this reference exists
- If exists and payout status is `APPROVED`, skip ledger creation and return existing payout
- Prevents duplicate debit/credit entries to accounts

## Cooldown Enforcement

### Purpose

Prevent rapid bank account changes that could be used to:
- Redirect payouts to fraud accounts
- Test account compromise

### Implementation

When driver adds/updates payout account:
1. Set `DriverProfile.payoutAccountCooldownUntil = now() + 24 hours`
2. On payout request, check: `now() > payoutAccountCooldownUntil OR cooldownUntil IS NULL`
3. Reject request if check fails with "Payout account change cooldown in effect"

## Re-authentication Placeholder

### Purpose (Future)

Track when driver should re-verify bank account (security measure).

### Current Implementation

When driver adds/updates payout account:
1. Set `DriverBankAccount.reAuthRequiredAt = now() + 30 days`
2. Return this field in API responses so frontend can show "Re-verify needed on [date]"
3. Not enforced yet (future requirement)

## Testing

### Unit Tests

```bash
npm test -- payouts.service.spec.ts --detectOpenHandles --runInBand
```

**Coverage:**
- ✅ Add payout account with cooldown
- ✅ Request payout with sufficient balance
- ✅ Reject request without KYC approval
- ✅ Reject request without verified account
- ✅ Reject request during cooldown
- ✅ Reject request below minimum (1000 NGN)
- ✅ Reject request with insufficient balance
- ✅ Admin approval creates double-entry ledger
- ✅ Approval creates DEBIT DRIVER_PAYABLE, CREDIT PAYOUT_CLEARING
- ✅ Duplicate approval is idempotent
- ✅ Admin can reject with required reason
- ✅ Admin can mark APPROVED → PROCESSING → PAID
- ✅ Admin can mark PROCESSING → FAILED with reversal
- ✅ Failed payout creates reversal ledger (opposite of approval)
- ✅ All state changes logged to AuditLog
- ✅ Unauthorized admin cannot approve (RBAC)

### Manual Testing Flow

1. **Setup driver**
   - Create driver account
   - Complete KYC approval

2. **Add payout account**
   - `POST /drivers/payout-account` with valid bank details
   - Verify cooldownUntil is 24h from now
   - Verify reAuthRequiredAt is 30d from now

3. **Wait cooldown (or mock time in tests)**
   - In tests, use mock dates
   - In dev, can manually adjust database

4. **Request payout**
   - Ensure driver has balance in DRIVER_PAYABLE account
   - `POST /drivers/payouts/request` with amount >= 1000
   - Verify status is REQUESTED

5. **Admin approval flow**
   - `GET /admin/payouts/requests` to view pending
   - `POST /admin/payouts/:id/approve-section17`
   - Verify status changed to APPROVED
   - Check ledger entries were created
   - Query `LedgerEntry` table: should see DEBIT and CREDIT for same transaction

6. **Admin processing flow**
   - `POST /admin/payouts/:id/processing`
   - Verify status changed to PROCESSING

7. **Admin mark paid**
   - `POST /admin/payouts/:id/paid` with provider reference
   - Verify status changed to PAID

## Known Limitations

1. **Provider integration not implemented**: `markPayoutProcessing` doesn't actually initiate transfer with provider
2. **Cooldown enforcement only for account changes**: Global cooldown per driver not implemented
3. **No partial payouts**: Requests are for full amount, no split payouts
4. **Manual approval flow**: No automatic approval based on thresholds or risk levels
5. **No payout scheduling**: All approved payouts must be manually processed
6. **Re-auth enforcement placeholder**: Currently just stores the date, not enforced
7. **Balance calculation**: Uses stored balance, not calculated from entries

## Future Enhancements (Phase 8+)

1. **Provider integration** - Actually transfer funds via Paystack/Flutterwave
2. **Automatic payouts** - Schedule payouts for automatic processing
3. **Partial reversals** - Support refunding only part of a payout
4. **Batch payouts** - Process multiple payouts in single provider batch
5. **Re-auth enforcement** - Block payout requests if re-auth expired
6. **Payout analytics** - Dashboard with payout trends, success rates
7. **Chargeback handling** - Ledger reversals for returned transfers
8. **Multi-currency** - Support payouts in different currencies

## Contact & Support

For payout-related issues:
1. Check PAYOUTS.md (this file) for expected behavior
2. Review LEDGER.md for accounting rules
3. Check test cases in payouts.service.spec.ts for examples
4. Verify KYC status: `GET /drivers/onboarding/status`
5. Verify payout account: `GET /drivers/payout-account`
6. Check balance: `GET /drivers/payouts/balance`
