-- CreateEnum
CREATE TYPE "ProviderEventStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "FinancialOperationType" AS ENUM ('TRANSFER_INITIATION', 'PAYOUT_RETRY', 'REFUND_INITIATION', 'MANUAL_RECONCILIATION');

-- CreateEnum
CREATE TYPE "FinancialOperationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'NEEDS_RECONCILIATION', 'DEAD_LETTER');

-- AlterEnum
ALTER TYPE "LedgerEventType" ADD VALUE IF NOT EXISTS 'REFUND_PROCESSED';
ALTER TYPE "LedgerEventType" ADD VALUE IF NOT EXISTS 'REFUND_COMMISSION_REVERSED';
ALTER TYPE "LedgerEventType" ADD VALUE IF NOT EXISTS 'REFUND_DRIVER_EARNING_REVERSED';
ALTER TYPE "LedgerEventType" ADD VALUE IF NOT EXISTS 'PAYOUT_RETRY_INITIATED';
ALTER TYPE "LedgerEventType" ADD VALUE IF NOT EXISTS 'RECONCILIATION_ADJUSTMENT';

-- AlterTable
ALTER TABLE "ProviderEvent"
  ADD COLUMN "status" "ProviderEventStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "nextRetryAt" TIMESTAMP(3),
  ADD COLUMN "deadLetteredAt" TIMESTAMP(3);

-- Backfill processed provider events.
UPDATE "ProviderEvent"
SET "status" = 'PROCESSED'
WHERE "processedAt" IS NOT NULL;

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN "ledgerReversedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Dispute"
  ADD COLUMN "adminStatus" TEXT,
  ADD COLUMN "adminNotes" TEXT,
  ADD COLUMN "resolvedById" UUID;

-- CreateTable
CREATE TABLE "FinancialOperation" (
  "id" UUID NOT NULL,
  "operationType" "FinancialOperationType" NOT NULL,
  "status" "FinancialOperationStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL,
  "providerReference" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "requestPayload" JSONB,
  "responsePayload" JSONB,
  "errorMessage" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancialOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderEvent_status_nextRetryAt_idx" ON "ProviderEvent"("status", "nextRetryAt");
CREATE INDEX "FinancialOperation_operationType_status_idx" ON "FinancialOperation"("operationType", "status");
CREATE INDEX "FinancialOperation_provider_providerReference_idx" ON "FinancialOperation"("provider", "providerReference");
CREATE INDEX "FinancialOperation_entityType_entityId_idx" ON "FinancialOperation"("entityType", "entityId");
CREATE INDEX "FinancialOperation_status_nextRetryAt_idx" ON "FinancialOperation"("status", "nextRetryAt");
