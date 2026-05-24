-- CreateEnum
CREATE TYPE "LedgerEventType" AS ENUM (
  'RIDER_PAYMENT_PENDING',
  'RIDER_PAYMENT_AUTHORIZED',
  'RIDER_PAYMENT_CAPTURED',
  'PLATFORM_COMMISSION_RECORDED',
  'DRIVER_EARNING_RECORDED',
  'DRIVER_PAYOUT_PENDING',
  'DRIVER_PAYOUT_PAID',
  'REFUND_PENDING',
  'ADJUSTMENT'
);

-- AlterTable
ALTER TABLE "LedgerEntry"
  ALTER COLUMN "walletId" DROP NOT NULL,
  ADD COLUMN "ledgerAccountId" UUID,
  ADD COLUMN "financialTransactionId" UUID,
  ADD COLUMN "eventType" "LedgerEventType",
  ADD COLUMN "metadata" JSONB;

-- CreateTable
CREATE TABLE "LedgerAccount" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "accountType" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "balance" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  "isSystem" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
  "id" UUID NOT NULL,
  "eventType" "LedgerEventType" NOT NULL,
  "reference" TEXT NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT,
  "paymentId" UUID,
  "payoutId" UUID,
  "tripId" UUID,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "amount" DECIMAL(18,2) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
  "id" UUID NOT NULL,
  "walletId" UUID NOT NULL,
  "financialTransactionId" UUID,
  "eventType" "LedgerEventType" NOT NULL,
  "transactionType" "TransactionType" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "balanceBefore" DECIMAL(18,2) NOT NULL,
  "balanceAfter" DECIMAL(18,2) NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT,
  "description" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_code_key" ON "LedgerAccount"("code");
CREATE INDEX "LedgerAccount_accountType_currency_idx" ON "LedgerAccount"("accountType", "currency");
CREATE UNIQUE INDEX "FinancialTransaction_reference_key" ON "FinancialTransaction"("reference");
CREATE INDEX "FinancialTransaction_eventType_createdAt_idx" ON "FinancialTransaction"("eventType", "createdAt");
CREATE INDEX "FinancialTransaction_paymentId_idx" ON "FinancialTransaction"("paymentId");
CREATE INDEX "FinancialTransaction_payoutId_idx" ON "FinancialTransaction"("payoutId");
CREATE INDEX "FinancialTransaction_tripId_idx" ON "FinancialTransaction"("tripId");
CREATE INDEX "LedgerEntry_ledgerAccountId_createdAt_idx" ON "LedgerEntry"("ledgerAccountId", "createdAt");
CREATE INDEX "LedgerEntry_financialTransactionId_idx" ON "LedgerEntry"("financialTransactionId");
CREATE INDEX "LedgerEntry_eventType_createdAt_idx" ON "LedgerEntry"("eventType", "createdAt");
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");
CREATE INDEX "WalletTransaction_financialTransactionId_idx" ON "WalletTransaction"("financialTransactionId");
CREATE INDEX "WalletTransaction_eventType_createdAt_idx" ON "WalletTransaction"("eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "LedgerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_financialTransactionId_fkey" FOREIGN KEY ("financialTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_financialTransactionId_fkey" FOREIGN KEY ("financialTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
