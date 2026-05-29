-- Section 16: Hardened Double-Entry Ledger System

-- Add immutability and double-entry validation fields to FinancialTransaction
ALTER TABLE "FinancialTransaction" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'POSTED';
ALTER TABLE "FinancialTransaction" ADD COLUMN "totalDebit" DECIMAL(18,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "FinancialTransaction" ADD COLUMN "totalCredit" DECIMAL(18,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "FinancialTransaction" ADD COLUMN "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FinancialTransaction" ADD COLUMN "reversedAt" TIMESTAMP(3);
ALTER TABLE "FinancialTransaction" ADD COLUMN "reversalReference" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN "reversalReferenceId" UUID;
ALTER TABLE "FinancialTransaction" ADD COLUMN "reversedByAdminId" TEXT;

-- Add foreign key for reversal tracking
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_reversalReferenceId_fkey" FOREIGN KEY ("reversalReferenceId") REFERENCES "FinancialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for ledger integrity
CREATE INDEX "FinancialTransaction_status_postedAt_idx" ON "FinancialTransaction"("status", "postedAt");
CREATE INDEX "FinancialTransaction_reversedAt_idx" ON "FinancialTransaction"("reversedAt");
CREATE INDEX "FinancialTransaction_reversalReferenceId_idx" ON "FinancialTransaction"("reversalReferenceId");

-- Create index for double-entry validation queries
CREATE INDEX "LedgerEntry_financialTransactionId_transactionType_idx" ON "LedgerEntry"("financialTransactionId", "transactionType");
