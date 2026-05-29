# Payment Integration System

## Overview

The RYDALUX payment system implements a multi-provider payment processing architecture supporting Paystack as the primary provider and Flutterwave as a secondary option. The system ensures idempotency, secure webhook handling, comprehensive audit logging, and robust ledger accounting.

## Architecture

### Payment Providers

The payment system supports pluggable payment providers through the `IPaymentProvider` interface:

```typescript
interface IPaymentProvider {
  initiatePayment(userId: string, tripId: string): Promise<PaymentInitializationResponse>;
  verifyTransaction(reference: string): Promise<PaymentVerificationResponse>;
  verifyWebhookSignature(body: string | Buffer, signature: string): boolean;
}
```

**Implemented Providers:**
- **Paystack**: Production-ready integration for Nigerian payment processing
- **Flutterwave**: Alternative provider with fallback support

### Core Services

#### PaymentsService
Core payment orchestration and ledger management:
- `initiateMockPayment()`: Mock payment for development/testing
- `authorizePaymentForTrip()`: Authorize payment when driver accepts trip
- `capturePaymentForTrip()`: Capture payment when trip completes
- `getPaymentForTrip()`: Retrieve payment status for a trip
- `getDriverPayouts()`: Get payout history for a driver
- `getRevenueStats()`: Revenue analytics across payment statuses
- `recordAccountEvent()`: Ledger transaction recording
- `recordWalletEvent()`: Wallet transaction recording

#### PaystackService
Paystack-specific payment provider implementation:
- `initiatePaystackPayment()`: Initialize Paystack payment authorization
- `verifyTransaction()`: Verify completed transaction with Paystack
- `verifyWebhookSignature()`: Validate webhook signature using HMAC-SHA512
- `handleWebhookEvent()`: Process webhook events with idempotency
- `saveDriverBankAccount()`: Register driver bank account for payouts
- `initiatePayoutTransfer()`: Execute payout transfer to driver
- `requestRefund()`: Initiate full/partial refund
- `handleChargeSuccess()`: Process successful charge event
- `handleChargeFailed()`: Process failed charge event
- `handleTransferSuccess()`: Process successful payout event
- `handleTransferFailed()`: Process failed payout event

#### FlutterwaveService
Flutterwave provider implementation (production-ready placeholder):
- `initiatePayment()`: Initialize Flutterwave payment authorization
- `verifyTransaction()`: Verify completed transaction with Flutterwave
- `verifyWebhookSignature()`: Validate webhook signature using HMAC-SHA256

## Payment Flow

### 1. Payment Initialization

When a rider requests payment for a trip:

```
POST /payments/paystack/initiate
Headers: Authorization: Bearer <rider_jwt>
Body: { tripId: string }
```

**Flow:**
1. Verify rider ownership of trip
2. Check fare quote exists
3. Create Payment record with status=PENDING
4. Record RIDER_PAYMENT_PENDING ledger event
5. Call Paystack API to get authorization URL
6. Return payment object + authorization URL to client

**Response:**
```json
{
  "payment": {
    "id": "pay_...",
    "tripId": "trip_...",
    "amount": 5000.00,
    "currency": "NGN",
    "status": "PENDING",
    "reference": "RYD-PAY-...",
    "provider": "paystack",
    "createdAt": "2026-05-29T06:00:00Z"
  },
  "authorizationUrl": "https://checkout.paystack.com/...",
  "accessCode": "..."
}
```

### 2. Payment Authorization (Webhook)

When rider completes payment on provider's checkout:

```
POST /webhooks/paystack
Headers: x-paystack-signature: <hmac_sha512_signature>
Body: { event: "charge.success", data: {...} }
```

**Flow:**
1. Verify webhook signature using `verifyWebhookSignature()`
2. Extract provider event ID for idempotency
3. Record ProviderEvent with status=PENDING
4. Process webhook event:
   - For `charge.success`: Verify transaction with provider, update Payment status=AUTHORIZED
   - For `charge.failed`: Update Payment status=FAILED, log audit
5. Mark ProviderEvent as PROCESSED
6. Return 200 OK immediately

### 3. Payment Capture (Trip Completion)

When driver completes trip (trip.status → COMPLETED):

**Automatic Flow:**
1. Check if payment exists for trip
2. Verify payment status is PENDING or AUTHORIZED
3. For Paystack: Ensure externalId is set (verified by webhook)
4. Update Payment status=CAPTURED
5. Record ledger events:
   - RIDER_PAYMENT_CAPTURED: CASH_CLEARING account +gross amount
   - PLATFORM_COMMISSION_RECORDED: COMMISSION_REVENUE account +commission (20%)
   - DRIVER_EARNING_RECORDED: DRIVER_PAYABLE account +driver share (80%)
6. Create Payout record for driver with status=PENDING
7. Record audit log

**Ledger Split (using basis points):**
- Platform Commission: 20% (2000 BPS)
- Driver Earning: 80% (8000 BPS)

### 4. Payout Transfer

Admin approves driver payout:

```
POST /admin/payouts/{payoutId}/initiate
Headers: Authorization: Bearer <admin_jwt>
```

**Flow:**
1. Verify payout status=PENDING
2. Verify driver has bank account registered with Paystack
3. Call Paystack transfer API
4. Update Payout status=PROCESSING with provider transfer code
5. Record FinancialOperation for tracking
6. On webhook `transfer.success`: Update Payout status=PAID
7. Record ledger: DRIVER_PAYOUT_PAID events to finalize accounts

## Security

### Webhook Signature Verification

**Paystack (HMAC-SHA512):**
```typescript
const hash = createHmac('sha512', webhookSecret)
  .update(body)
  .digest('hex');
timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
```

**Flutterwave (HMAC-SHA256):**
```typescript
const hash = createHmac('sha256', webhookSecret)
  .update(body)
  .digest('hex');
hash === signature;
```

### Card Data Security

**NEVER stored:**
- Full card number (PAN)
- CVV/CVN
- Card expiration in full
- PIN

**Safe to store:**
- Last 4 digits (last4)
- Card type (visa, mastercard, etc)
- Issuing bank name
- Card holder name (hashed optional)

### Secrets Management

All secrets loaded from environment variables via ConfigService:
- `PAYSTACK_SECRET_KEY`: Paystack API authentication
- `PAYSTACK_WEBHOOK_SECRET`: Paystack webhook verification
- `FLUTTERWAVE_SECRET_KEY`: Flutterwave API authentication (optional)
- `FLUTTERWAVE_WEBHOOK_SECRET`: Flutterwave webhook verification (optional)

**Never log or expose:**
- Full secret keys
- Full payment references
- Card information

## Idempotency

### Provider Event Idempotency

Each webhook event is recorded with a unique `providerEventId`:

```
providerEventId = `${event}:${data.id}` OR `${event}:${reference}` OR hash(payload)
```

**Guarantees:**
1. First webhook processing: Status transitions normally
2. Duplicate webhook (same eventId): Skipped due to existing processedAt
3. Failed webhook: Retried with exponential backoff to nextRetryAt
4. Dead-lettered: Manually reviewed before replay

### Request Idempotency

Payment initialization requests include optional idempotency-key header:

```
POST /payments/paystack/initiate
Headers: idempotency-key: <uuid>
```

**Guarantees:**
1. Duplicate requests with same key return same payment
2. No duplicate PENDING payment records created
3. Key stored in IdempotencyKey table with request metadata

## Payment Status Lifecycle

```
[PENDING] → [AUTHORIZED] → [CAPTURED] → ✓ (Success)
            ↓
        [FAILED] (charge.failed webhook)

[CAPTURED] → [REFUNDED] (after refund.processed webhook)
```

**State Meanings:**
- **PENDING**: Payment initiated, awaiting customer confirmation
- **AUTHORIZED**: Customer authorized payment, awaiting capture
- **CAPTURED**: Payment confirmed and ledger entries recorded
- **FAILED**: Payment declined or customer cancelled
- **REFUNDED**: Payment refunded after successful capture

## Ledger Accounting

### Transaction Types

**Account Event Types:**
- RIDER_PAYMENT_PENDING: Commitment to receive funds
- RIDER_PAYMENT_AUTHORIZED: Authorization confirmed by provider
- RIDER_PAYMENT_CAPTURED: Funds confirmed captured
- PLATFORM_COMMISSION_RECORDED: Platform commission booked
- DRIVER_EARNING_RECORDED: Driver's share booked to wallet
- DRIVER_PAYOUT_PENDING: Payout scheduled
- DRIVER_PAYOUT_PAID: Payout completed
- REFUND_PROCESSED: Refund applied to ledger
- REFUND_COMMISSION_REVERSED: Platform commission reversed
- REFUND_DRIVER_EARNING_REVERSED: Driver earning reversed

**Account Ledger:**
- **CASH_CLEARING**: Asset account for received funds
- **COMMISSION_REVENUE**: Revenue account for platform earnings
- **DRIVER_PAYABLE**: Liability account for driver balances
- **PAYOUT_CLEARING**: Liability account for transfer-in-flight

### Example: 5000 NGN Trip

```
CREDITED (CASH_CLEARING): 5000.00 NGN
CREDITED (COMMISSION_REVENUE): 1000.00 NGN (20%)
CREDITED (DRIVER_PAYABLE): 4000.00 NGN (80%)
CREDITED (PAYOUT_CLEARING): 4000.00 NGN (when payout initiated)
DEBITED (DRIVER_PAYABLE): 4000.00 NGN (when payout succeeds)
DEBITED (PAYOUT_CLEARING): 4000.00 NGN (when payout succeeds)
```

## Error Handling

### Webhook Processing Failures

Failed events are automatically retried:
1. **First failure**: nextRetryAt = now + 5 minutes
2. **Persistent failures**: nextRetryAt increments, max 15 minutes
3. **After N attempts**: Admin can manually dead-letter

**Example:**
```typescript
if (!processed) {
  await prisma.providerEvent.update({
    where: { id: providerEventId },
    data: {
      status: 'FAILED',
      lastError: message,
      nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });
}
```

### Payment Verification Failures

**Gated payment capture:**
```typescript
if (payment.provider === 'paystack' && !payment.externalId) {
  // Don't capture ledger until external confirmation
  return;
}
```

This prevents ledger-payment mismatch if webhook is delayed.

## Testing

### Unit Tests

**PaymentsService tests:**
- Payment initialization with ownership validation
- Payment capture with multi-ledger recording
- Payout creation and status transitions
- Revenue statistics calculations

**PaystackService tests:**
- Webhook signature verification
- Provider event idempotency
- Refund ledger reversal
- Payout retry logic

### Integration Tests

Full end-to-end payment lifecycle:
1. Rider initiates payment
2. Webhook confirms authorization
3. Trip completes (capture)
4. Ledger entries verified
5. Admin approves payout
6. Payout succeeds

## Configuration

### Environment Variables

```bash
# Paystack
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_WEBHOOK_SECRET=whsec_live_...

# Flutterwave (optional)
FLUTTERWAVE_SECRET_KEY=FLWSECK_LIVE_...
FLUTTERWAVE_WEBHOOK_SECRET=fw_webhook_...

# Callback URLs
PAYSTACK_CALLBACK_URL=https://app.example.com/payment/paystack/callback
FLUTTERWAVE_CALLBACK_URL=https://app.example.com/payment/flutterwave/callback

# Rate limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=20
```

## API Endpoints

### Rider Endpoints

```
POST /payments/paystack/initiate          - Initiate payment
GET  /payments/trip/{tripId}              - Get payment status
GET  /payouts/history                     - Get driver payouts

POST /webhooks/paystack                   - Paystack webhook (⚠️ SkipThrottle)
POST /webhooks/flutterwave                - Flutterwave webhook (⚠️ SkipThrottle)
```

### Admin Endpoints

```
GET  /admin/finance/payments              - List all payments
GET  /admin/finance/payouts               - List all payouts
GET  /admin/finance/ledger                - View ledger entries
GET  /admin/finance/reconciliation        - Reconciliation status
POST /admin/finance/reconciliation/run    - Manual reconciliation

POST /admin/finance/disputes/{id}/resolve - Resolve chargeback
POST /admin/payouts/{id}/retry            - Retry failed payout
```

## Limitations & Future Work

### Phase 7.6 (Implemented)
- Full payment provider abstraction
- Webhook idempotency
- Comprehensive ledger accounting
- Refund processing
- Dispute management
- Manual reconciliation

### Phase 8+ (Future)
- Partial refunds (currently full-refund only)
- Multi-currency support (currently NGN only)
- Recurring billing
- Payment plan installments
- Direct bank transfer support
- Mobile money integration

## Monitoring & Debugging

### Key Metrics

- Payment success rate: CAPTURED / initiated
- Average authorization time: time from PENDING to AUTHORIZED
- Webhook success rate: PROCESSED / total events
- Ledger reconciliation gap: sum(CAPTURED) - sum(PAID payouts) - (pending payouts)

### Debugging Webhooks

Enable provider event logging:

```typescript
// List unprocessed events
GET /admin/finance/provider-events?status=FAILED

// Retry specific event
POST /admin/finance/provider-events/{id}/retry

// Dead-letter problematic event
POST /admin/finance/provider-events/{id}/dead-letter?reason=Invalid+payload
```

### Reconciliation

Run manual reconciliation to fix ledger mismatches:

```typescript
POST /admin/finance/reconciliation/run
```

This processes pending refunds, retries failed transfers, and identifies discrepancies.
