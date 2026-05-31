-- 1. Create missing enums if they do not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportTicketType') THEN
        CREATE TYPE "SupportTicketType" AS ENUM ('PAYMENT_ISSUE', 'DRIVER_COMPLAINT', 'RIDER_COMPLAINT', 'LOST_ITEM', 'SAFETY_ISSUE', 'CANCELLATION_ISSUE', 'REFUND_REQUEST', 'PAYOUT_ISSUE', 'ACCOUNT_ISSUE', 'VEHICLE_ISSUE', 'SHIPMENT_ISSUE', 'OTHER');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportTicketPriority') THEN
        CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
    END IF;
END $$;

-- 2. Alter enum SupportStatus to add missing values if not exists
ALTER TYPE "SupportStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
ALTER TYPE "SupportStatus" ADD VALUE IF NOT EXISTS 'WAITING_ON_USER';
ALTER TYPE "SupportStatus" ADD VALUE IF NOT EXISTS 'WAITING_ON_ADMIN';
ALTER TYPE "SupportStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';

-- 3. Rename userId to createdById safely if userId exists and createdById does not
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='SupportTicket' AND column_name='userId'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='SupportTicket' AND column_name='createdById'
    ) THEN
        ALTER TABLE "SupportTicket" RENAME COLUMN "userId" TO "createdById";
    END IF;
END $$;

-- 4. Add createdById safely if neither exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='SupportTicket' AND column_name='createdById'
    ) THEN
        ALTER TABLE "SupportTicket" ADD COLUMN "createdById" UUID;
        -- Backfill existing rows to first user if any exists
        UPDATE "SupportTicket" SET "createdById" = (SELECT id FROM "User" LIMIT 1) WHERE "createdById" IS NULL;
        ALTER TABLE "SupportTicket" ALTER COLUMN "createdById" SET NOT NULL;
    END IF;
END $$;

-- 5. Rename subject to title safely if subject exists and title does not
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='SupportTicket' AND column_name='subject'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='SupportTicket' AND column_name='title'
    ) THEN
        ALTER TABLE "SupportTicket" RENAME COLUMN "subject" TO "title";
    END IF;
END $$;

-- 6. Alter priority from TEXT to SupportTicketPriority ENUM safely if it is currently text
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='SupportTicket' AND column_name='priority' AND data_type='text'
    ) THEN
        ALTER TABLE "SupportTicket" ALTER COLUMN "priority" TYPE "SupportTicketPriority" USING (COALESCE("priority", 'MEDIUM')::"SupportTicketPriority");
    END IF;
    ALTER TABLE "SupportTicket" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';
END $$;

-- 7. Add type column safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='SupportTicket' AND column_name='type'
    ) THEN
        ALTER TABLE "SupportTicket" ADD COLUMN "type" "SupportTicketType" NOT NULL DEFAULT 'OTHER';
    END IF;
END $$;

-- 8. Add all missing relation columns expected by schema.prisma
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "tripId" UUID;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "paymentId" UUID;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "payoutId" UUID;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "sosEventId" UUID;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "incidentReportId" UUID;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "vehicleId" UUID;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "shipmentId" UUID;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "assignedToId" UUID;

-- 9. Add foreign keys safely
ALTER TABLE "SupportTicket" DROP CONSTRAINT IF EXISTS "SupportTicket_userId_fkey";
ALTER TABLE "SupportTicket" DROP CONSTRAINT IF EXISTS "SupportTicket_createdById_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupportTicket" DROP CONSTRAINT IF EXISTS "SupportTicket_assignedToId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportTicket" DROP CONSTRAINT IF EXISTS "SupportTicket_tripId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportTicket" DROP CONSTRAINT IF EXISTS "SupportTicket_paymentId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportTicket" DROP CONSTRAINT IF EXISTS "SupportTicket_payoutId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportTicket" DROP CONSTRAINT IF EXISTS "SupportTicket_sosEventId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_sosEventId_fkey" FOREIGN KEY ("sosEventId") REFERENCES "SosEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportTicket" DROP CONSTRAINT IF EXISTS "SupportTicket_incidentReportId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_incidentReportId_fkey" FOREIGN KEY ("incidentReportId") REFERENCES "IncidentReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportTicket" DROP CONSTRAINT IF EXISTS "SupportTicket_vehicleId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportTicket" DROP CONSTRAINT IF EXISTS "SupportTicket_shipmentId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 10. Create indexes safely
DROP INDEX IF EXISTS "SupportTicket_userId_status_idx";
CREATE INDEX IF NOT EXISTS "SupportTicket_createdById_status_idx" ON "SupportTicket"("createdById", "status");
CREATE INDEX IF NOT EXISTS "SupportTicket_assignedToId_status_idx" ON "SupportTicket"("assignedToId", "status");
CREATE INDEX IF NOT EXISTS "SupportTicket_type_status_idx" ON "SupportTicket"("type", "status");
CREATE INDEX IF NOT EXISTS "SupportTicket_priority_status_idx" ON "SupportTicket"("priority", "status");
CREATE INDEX IF NOT EXISTS "SupportTicket_tripId_idx" ON "SupportTicket"("tripId");
CREATE INDEX IF NOT EXISTS "SupportTicket_paymentId_idx" ON "SupportTicket"("paymentId");
CREATE INDEX IF NOT EXISTS "SupportTicket_payoutId_idx" ON "SupportTicket"("payoutId");
CREATE INDEX IF NOT EXISTS "SupportTicket_shipmentId_idx" ON "SupportTicket"("shipmentId");

-- 11. Create SupportTicketMessage table if missing
CREATE TABLE IF NOT EXISTS "SupportTicketMessage" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

-- 12. Create SupportTicketAttachment table if missing
CREATE TABLE IF NOT EXISTS "SupportTicketAttachment" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketAttachment_pkey" PRIMARY KEY ("id")
);

-- 13. Add relation keys for message and attachment tables safely
ALTER TABLE "SupportTicketMessage" DROP CONSTRAINT IF EXISTS "SupportTicketMessage_ticketId_fkey";
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicketMessage" DROP CONSTRAINT IF EXISTS "SupportTicketMessage_authorId_fkey";
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupportTicketAttachment" DROP CONSTRAINT IF EXISTS "SupportTicketAttachment_ticketId_fkey";
ALTER TABLE "SupportTicketAttachment" ADD CONSTRAINT "SupportTicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicketAttachment" DROP CONSTRAINT IF EXISTS "SupportTicketAttachment_uploadedById_fkey";
ALTER TABLE "SupportTicketAttachment" ADD CONSTRAINT "SupportTicketAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 14. Create indexes for message and attachment tables safely
CREATE INDEX IF NOT EXISTS "SupportTicketMessage_ticketId_isInternal_idx" ON "SupportTicketMessage"("ticketId", "isInternal");
CREATE INDEX IF NOT EXISTS "SupportTicketMessage_authorId_createdAt_idx" ON "SupportTicketMessage"("authorId", "createdAt");

CREATE INDEX IF NOT EXISTS "SupportTicketAttachment_ticketId_idx" ON "SupportTicketAttachment"("ticketId");
CREATE INDEX IF NOT EXISTS "SupportTicketAttachment_uploadedById_idx" ON "SupportTicketAttachment"("uploadedById");
