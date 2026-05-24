-- AlterEnum
ALTER TYPE "FinancialOperationType" ADD VALUE IF NOT EXISTS 'SCHEDULED_RECONCILIATION';
ALTER TYPE "FinancialOperationType" ADD VALUE IF NOT EXISTS 'PROVIDER_EVENT_RETRY';
ALTER TYPE "FinancialOperationType" ADD VALUE IF NOT EXISTS 'DAILY_CLOSE';

-- CreateTable
CREATE TABLE "DailyCloseReport" (
  "id" UUID NOT NULL,
  "closeDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "grossCapturedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  "refundAmount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  "paidPayoutAmount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  "platformCommissionAmount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  "driverEarningAmount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  "failedProviderEvents" INTEGER NOT NULL DEFAULT 0,
  "staleProcessingPayouts" INTEGER NOT NULL DEFAULT 0,
  "unreversedRefunds" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'GENERATED',
  "metadata" JSONB,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DailyCloseReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyCloseReport_closeDate_currency_key" ON "DailyCloseReport"("closeDate", "currency");
CREATE INDEX "DailyCloseReport_closeDate_idx" ON "DailyCloseReport"("closeDate");
CREATE INDEX "DailyCloseReport_status_idx" ON "DailyCloseReport"("status");
