-- Add missing SupportTicket timestamp columns expected by Prisma schema.
-- Safe forward-only schema drift repair.

ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
