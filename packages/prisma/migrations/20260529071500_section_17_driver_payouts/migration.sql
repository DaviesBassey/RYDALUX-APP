-- Section 17: Driver Payouts System


-- Update Payout table with new fields for payout request/approval workflow
ALTER TABLE "Payout" ALTER COLUMN "status" SET DEFAULT 'REQUESTED';
ALTER TABLE "Payout" ADD COLUMN "requestedByDriverId" UUID;
ALTER TABLE "Payout" ADD COLUMN "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Payout" ADD COLUMN "approvedByAdminId" TEXT;
ALTER TABLE "Payout" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Payout" ADD COLUMN "rejectedByAdminId" TEXT;
ALTER TABLE "Payout" ADD COLUMN "rejectedAt" TIMESTAMP(3);
ALTER TABLE "Payout" ADD COLUMN "rejectionReason" TEXT;

-- Create index for efficient status filtering
CREATE INDEX "Payout_status_createdAt_idx" ON "Payout"("status", "createdAt");

-- Update DriverProfile table with payout account cooldown field
ALTER TABLE "DriverProfile" ADD COLUMN "payoutAccountCooldownUntil" TIMESTAMP(3);

-- Update DriverBankAccount table with verification and re-auth fields
ALTER TABLE "DriverBankAccount" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "DriverBankAccount" ADD COLUMN "reAuthRequiredAt" TIMESTAMP(3);

-- Create index for efficient verification queries
CREATE INDEX "DriverBankAccount_driverProfileId_verifiedAt_idx" ON "DriverBankAccount"("driverProfileId", "verifiedAt");
