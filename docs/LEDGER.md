# Ledger System Architecture - Section 16

## Overview

The RYDALUX ledger is a fintech-grade, immutable double-entry accounting system that ensures financial integrity through strict balance validation, transaction immutability, and comprehensive audit trails.

## Core Principles

### 1. Double-Entry Accounting

Every transaction must have at least two entries:
- **Debit Entry**: Increases asset accounts or decreases liability accounts
- **Credit Entry**: Increases liability accounts or decreases asset accounts

**Fundamental Rule**: Total debits MUST equal total credits

```
Debits = Credits
∑(DEBIT) = ∑(CREDIT)
```

### 2. Immutability

Once posted, ledger entries **cannot be modified or deleted**. This ensures:
- Audit trail integrity
- Regulatory compliance
- Detection of unauthorized changes

**Allowed**: Create reversals (new transactions that offset original)
**Forbidden**: Update or delete posted entries

### 3. Idempotency

Duplicate transactions are prevented by:
- Unique `reference` field on FinancialTransaction
- Idempotency checks before recording
- Webhook event tracking to prevent double-posting

## Database Schema

### FinancialTransaction

Core transaction record that groups related ledger entries:

```typescript
model FinancialTransaction {
  id                  String
  reference           String      // Unique, immutable
  eventType           LedgerEventType
  status              String      // "POSTED" or "REVERSED"
  
  // Double-entry validation
  totalDebit          Decimal     // Sum of all debits
  totalCredit         Decimal     // Sum of all credits
  
  // Immutability tracking
  postedAt            DateTime    // When transaction was posted
  reversedAt          DateTime?   // When/if reversed
  reversalReference   String?     // Link to reversal transaction
  reversedByAdminId   String?     // Admin who reversed it
  
  // Relationships
  ledgerEntries       LedgerEntry[]
  payment             Payment?    // FK to payment
  payout              Payout?     // FK to payout
  trip                Trip?       // FK to trip
  
  @@index([status, postedAt])
  @@index([reversedAt])
}
```

### LedgerEntry

Individual debit/credit entry linked to a transaction:

```typescript
model LedgerEntry {
  id                      String
  financialTransactionId  String
  ledgerAccountId         String?
  walletId                String?
  
  transactionType         TransactionType  // "DEBIT" or "CREDIT"
  amount                  Decimal
  
  // Balance tracking
  balanceAfter            Decimal   // Account balance after this entry
  
  // Reference
  description             String?
  metadata                Json?
  createdAt               DateTime  @default(now())
  
  // Prevent updates via application code
  @@index([financialTransactionId, transactionType])
}
```

### LedgerAccount

General ledger accounts that accumulate balances:

```typescript
model LedgerAccount {
  code        String      // "platform:cash_clearing:NGN"
  name        String      // "Platform cash clearing"
  accountType String      // "ASSET", "LIABILITY", "REVENUE", etc.
  currency    String      // "NGN"
  
  balance     Decimal     // Current accumulated balance
  isSystem    Boolean     // Immutable, auto-created system account
}
```

## Account Types

### Platform Accounts (ASSET)
- **CASH_CLEARING**: NGN funds received from riders, awaiting distribution
  - Debited when: Payment authorized
  - Credited when: Payout released or refund issued

### Platform Accounts (LIABILITY)
- **DRIVER_PAYABLE**: Amount owed to drivers from completed trips
  - Credited when: Trip completed and payment captured
  - Debited when: Payout transferred

- **PAYOUT_CLEARING**: Payouts in transit to drivers
  - Credited when: Payout initiated to provider
  - Debited when: Payout succeeds or fails

- **REFUND_PAYABLE**: Refunds owed to riders
  - Credited when: Refund authorized
  - Debited when: Refund processed

### Platform Accounts (REVENUE)
- **COMMISSION_REVENUE**: Platform earnings
  - Credited when: Trip completed (20% of fare)
  - Debited when: Reversed due to cancellation/refund

### Adjustment Accounts
- **ADJUSTMENT**: Manual corrections by admin
  - Used for counterparty to manually adjusted balances
  - Always requires audit log with reason

## Transaction Flow

### Payment Capture Example

```
Trip Fare: 5000 NGN
Driver Share: 4000 NGN (80%)
Commission: 1000 NGN (20%)

FinancialTransaction {
  reference: "PAYMENT-ABC123",
  eventType: "PAYMENT_CAPTURED",
  status: "POSTED",
  totalDebit: 5000.00,
  totalCredit: 5000.00
}

LedgerEntry 1:
  ledgerAccount: CASH_CLEARING
  transactionType: DEBIT
  amount: 5000.00
  description: "Payment captured"

LedgerEntry 2:
  ledgerAccount: COMMISSION_REVENUE
  transactionType: CREDIT
  amount: 1000.00
  description: "Platform commission"

LedgerEntry 3:
  ledgerAccount: DRIVER_PAYABLE
  transactionType: CREDIT
  amount: 4000.00
  description: "Driver earning"

Verification:
  ∑Debits = 5000.00 ✓
  ∑Credits = 5000.00 ✓
  Balanced = TRUE ✓
```

## Validation Rules

### Rule 1: Balance Validation
```typescript
if (∑debits ≠ ∑credits) {
  throw BadRequestException("Ledger must balance")
}
```

### Rule 2: Immutability Enforcement
```typescript
if (entry.postedAt && now - entry.postedAt > 1s) {
  throw ForbiddenException("Cannot modify posted entries")
}
```

### Rule 3: Reversal Integrity
```typescript
if (originalTransaction.status ≠ "POSTED") {
  throw BadRequestException("Can only reverse posted transactions")
}
// Reversal creates new transaction with inverted entries
reversalEntry.transactionType = 
  originalEntry.transactionType === "DEBIT" ? "CREDIT" : "DEBIT"
```

### Rule 4: Manual Adjustment Authorization
```typescript
if (!adminId) {
  throw ForbiddenException("Admin required for manual adjustment")
}
if (!reason || reason.trim() === "") {
  throw BadRequestException("Reason required for adjustment")
}
// Audit log created automatically
auditLog.action = "LEDGER_MANUAL_ADJUSTMENT"
auditLog.payload.adjustedByAdminId = adminId
auditLog.payload.reason = reason
```

## Usage Examples

### Recording a Payment Capture

```typescript
await tx.$transaction(async (tx) => {
  const txn = await paymentsService.recordAccountEvent(tx, {
    eventType: 'PAYMENT_CAPTURED',
    reference: 'PAY-12345',
    amount: '5000.00',
    // ... other fields
  });
  
  // Validate double-entry balance
  await ledgerService.validateLedgerBalance(tx, txn.id);
});
```

### Creating a Reversal

```typescript
const reversalId = await ledgerService.createReversal(
  tx,
  originalTransactionId,
  adminId,
  'Payment customer requested refund'
);

// Original transaction marked as REVERSED
// New transaction created with inverted entries
// Both transactions must balance independently
```

### Recording a Manual Adjustment

```typescript
const adjustmentId = await ledgerService.recordManualAdjustment(
  tx,
  adminId,          // Required admin ID
  accountId,        // Which account to adjust
  50000n,           // Amount in minor units
  'DEBIT',          // Type
  'Correction for duplicate charge on acct ABC'  // Required reason
);

// Creates balanced transaction (debit + credit)
// Audit log recorded automatically
```

### Checking Transaction Balance

```typescript
const balance = await ledgerService.getTransactionBalance(tx, transactionId);
console.log(`Debits: ${balance.debits}, Credits: ${balance.credits}`);
console.log(`Balanced: ${balance.balanced}`); // Must be true
```

## Idempotency Guarantee

Duplicate payment webhook processing is prevented:

```
First webhook:
  reference = "PAYMENT-123"
  transaction created
  ✓ ledger entries recorded
  
Duplicate webhook (same reference):
  reference = "PAYMENT-123"
  idempotency check → existing transaction found
  ✓ returns existing transaction (no new entries)
  
Result: 
  Ledger integrity maintained
  No double-posting
```

## Reconciliation

### Ledger Reconciliation Checks

```sql
-- Verify all transactions balance
SELECT id, totalDebit, totalCredit
FROM "FinancialTransaction"
WHERE totalDebit ≠ totalCredit;

-- Should return: (empty)

-- Verify account balance against entries
SELECT 
  la.id,
  la.balance,
  SUM(CASE WHEN le.transactionType = 'CREDIT' THEN le.amount ELSE -le.amount END) as calculated
FROM "LedgerAccount" la
LEFT JOIN "LedgerEntry" le ON la.id = le.ledgerAccountId
GROUP BY la.id
HAVING la.balance ≠ calculated;

-- Should return: (empty)
```

### Manual Adjustments Audit

```sql
-- Find all manual adjustments and who made them
SELECT 
  ft.id,
  ft.reference,
  ft.metadata->>'adjustedByAdminId' as admin_id,
  ft.metadata->>'reason' as reason,
  ft.postedAt
FROM "FinancialTransaction" ft
WHERE ft.eventType = 'ADJUSTMENT'
ORDER BY ft.postedAt DESC;
```

## Security & Compliance

### Audit Trail
- Every manual adjustment creates AuditLog entry
- Immutable ledger entries prevent undetected tampering
- Reversal audit trail links original → reversal transactions

### Authorization
- Manual adjustments require admin ID
- Reversal operations logged with admin ID
- All financial operations in AuditLog

### Immutability
- Posted entries cannot be updated (enforced in code)
- Updates rejected with `ForbiddenException`
- Only reversals allowed for correction

## Known Limitations

1. **Account balance calculation**: Currently stored in `LedgerAccount.balance`, not calculated on-the-fly from entries
2. **Multi-currency**: Currently NGN only (Phase 8+)
3. **Reconciliation**: Semi-manual, periodic validation needed
4. **Partial reversals**: Only full transaction reversals supported (Phase 8+)

## Testing

Run ledger tests:

```bash
npm test -- ledger.service.spec.ts --detectOpenHandles --runInBand
```

Tests cover:
- ✅ Balanced double-entry validation
- ✅ Unbalanced transaction rejection
- ✅ Immutability enforcement
- ✅ Reversal transaction creation
- ✅ Manual adjustments with audit
- ✅ Idempotency checks

## Future Enhancements (Phase 8+)

1. **Real-time balance calculation** from ledger entries
2. **Multi-currency** support with exchange rates
3. **Partial reversals** for split refunds
4. **Advanced reconciliation** automation
5. **Blockchain audit trail** for immutability verification
6. **Financial reporting** API (balance sheet, P&L)

## Glossary

| Term | Definition |
|------|-----------|
| **Debit** | Increases assets, decreases liabilities; left side of ledger |
| **Credit** | Increases liabilities, decreases assets; right side of ledger |
| **Posting** | Recording transaction and entries as finalized |
| **Reversal** | Creating new offsetting transaction (never modifying original) |
| **Reconciliation** | Verifying ledger balances match physical reality |
| **Immutable** | Cannot be modified or deleted after posting |
| **Idempotent** | Duplicate operations produce same result as single operation |

## Contact & Support

For ledger-related issues:
1. Check PAYMENTS.md for payment flow documentation
2. Review LEDGER.md (this file) for accounting rules
3. Examine test cases in ledger.service.spec.ts
4. Contact finance team for reconciliation questions
