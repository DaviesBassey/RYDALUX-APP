-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'AWAITING_RESPONSE', 'UNDER_REVIEW', 'WON', 'LOST', 'CLOSED');

-- AlterTable
ALTER TABLE "Payout"
  ADD COLUMN "providerTransferId" TEXT,
  ADD COLUMN "providerTransferCode" TEXT,
  ADD COLUMN "transferFailureReason" TEXT,
  ADD COLUMN "transferInitiatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DriverBankAccount" (
  "id" UUID NOT NULL,
  "driverProfileId" UUID NOT NULL,
  "bankCode" TEXT NOT NULL,
  "bankName" TEXT,
  "accountName" TEXT NOT NULL,
  "accountNumberLast4" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "provider" TEXT NOT NULL DEFAULT 'paystack',
  "paystackRecipientCode" TEXT,
  "recipientCreatedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "DriverBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
  "id" UUID NOT NULL,
  "paymentId" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL,
  "providerReference" TEXT,
  "providerRefundId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "requestedById" UUID,
  "processedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
  "id" UUID NOT NULL,
  "paymentId" UUID,
  "provider" TEXT NOT NULL,
  "providerDisputeId" TEXT NOT NULL,
  "reference" TEXT,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "category" TEXT,
  "reason" TEXT,
  "amount" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "metadata" JSONB,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverBankAccount_driverProfileId_key" ON "DriverBankAccount"("driverProfileId");
CREATE UNIQUE INDEX "DriverBankAccount_paystackRecipientCode_key" ON "DriverBankAccount"("paystackRecipientCode");
CREATE INDEX "DriverBankAccount_provider_paystackRecipientCode_idx" ON "DriverBankAccount"("provider", "paystackRecipientCode");
CREATE UNIQUE INDEX "Payout_providerTransferCode_key" ON "Payout"("providerTransferCode");
CREATE INDEX "Payout_provider_providerTransferCode_idx" ON "Payout"("provider", "providerTransferCode");
CREATE INDEX "Refund_paymentId_status_idx" ON "Refund"("paymentId", "status");
CREATE INDEX "Refund_provider_providerReference_idx" ON "Refund"("provider", "providerReference");
CREATE INDEX "Refund_status_createdAt_idx" ON "Refund"("status", "createdAt");
CREATE UNIQUE INDEX "Dispute_provider_providerDisputeId_key" ON "Dispute"("provider", "providerDisputeId");
CREATE INDEX "Dispute_paymentId_status_idx" ON "Dispute"("paymentId", "status");
CREATE INDEX "Dispute_provider_reference_idx" ON "Dispute"("provider", "reference");
CREATE INDEX "Dispute_status_createdAt_idx" ON "Dispute"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "DriverBankAccount" ADD CONSTRAINT "DriverBankAccount_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
