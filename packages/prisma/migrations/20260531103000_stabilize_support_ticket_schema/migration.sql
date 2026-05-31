-- CreateEnum
CREATE TYPE "SupportTicketType" AS ENUM ('PAYMENT_ISSUE', 'DRIVER_COMPLAINT', 'RIDER_COMPLAINT', 'LOST_ITEM', 'SAFETY_ISSUE', 'CANCELLATION_ISSUE', 'REFUND_REQUEST', 'PAYOUT_ISSUE', 'ACCOUNT_ISSUE', 'VEHICLE_ISSUE', 'SHIPMENT_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterEnum
ALTER TYPE "SupportStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
ALTER TYPE "SupportStatus" ADD VALUE IF NOT EXISTS 'WAITING_ON_USER';
ALTER TYPE "SupportStatus" ADD VALUE IF NOT EXISTS 'WAITING_ON_ADMIN';
ALTER TYPE "SupportStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';

-- Rename userId to createdById safely
ALTER TABLE "SupportTicket" RENAME COLUMN "userId" TO "createdById";

-- Drop old foreign key constraint and add the new one pointing to User(id)
ALTER TABLE "SupportTicket" DROP CONSTRAINT IF EXISTS "SupportTicket_userId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old index and add the new one
DROP INDEX IF EXISTS "SupportTicket_userId_status_idx";
CREATE INDEX IF NOT EXISTS "SupportTicket_createdById_status_idx" ON "SupportTicket"("createdById", "status");

-- Rename subject to title
ALTER TABLE "SupportTicket" RENAME COLUMN "subject" TO "title";

-- Alter priority from TEXT to SupportTicketPriority ENUM safely
ALTER TABLE "SupportTicket" ALTER COLUMN "priority" TYPE "SupportTicketPriority" USING (COALESCE("priority", 'MEDIUM')::"SupportTicketPriority");
ALTER TABLE "SupportTicket" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';

-- Add type column
ALTER TABLE "SupportTicket" ADD COLUMN "type" "SupportTicketType" NOT NULL DEFAULT 'OTHER';

-- Add missing relation columns safely
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "tripId" UUID;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "paymentId" UUID;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "payoutId" UUID;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "sosEventId" UUID;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "incidentReportId" UUID;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "vehicleId" UUID;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "shipmentId" UUID;

-- Drop constraints if already exist and add foreign keys
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

-- Create Indexes safely
CREATE INDEX IF NOT EXISTS "SupportTicket_assignedToId_status_idx" ON "SupportTicket"("assignedToId", "status");
CREATE INDEX IF NOT EXISTS "SupportTicket_type_status_idx" ON "SupportTicket"("type", "status");
CREATE INDEX IF NOT EXISTS "SupportTicket_priority_status_idx" ON "SupportTicket"("priority", "status");
CREATE INDEX IF NOT EXISTS "SupportTicket_tripId_idx" ON "SupportTicket"("tripId");
CREATE INDEX IF NOT EXISTS "SupportTicket_paymentId_idx" ON "SupportTicket"("paymentId");
CREATE INDEX IF NOT EXISTS "SupportTicket_payoutId_idx" ON "SupportTicket"("payoutId");
CREATE INDEX IF NOT EXISTS "SupportTicket_shipmentId_idx" ON "SupportTicket"("shipmentId");

-- Create SupportTicketMessage table if not exists
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

-- Create SupportTicketAttachment table if not exists
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

-- Add SupportTicketMessage foreign keys
ALTER TABLE "SupportTicketMessage" DROP CONSTRAINT IF EXISTS "SupportTicketMessage_ticketId_fkey";
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicketMessage" DROP CONSTRAINT IF EXISTS "SupportTicketMessage_authorId_fkey";
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add SupportTicketAttachment foreign keys
ALTER TABLE "SupportTicketAttachment" DROP CONSTRAINT IF EXISTS "SupportTicketAttachment_ticketId_fkey";
ALTER TABLE "SupportTicketAttachment" ADD CONSTRAINT "SupportTicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add SupportTicketAttachment uploader key
ALTER TABLE "SupportTicketAttachment" DROP CONSTRAINT IF EXISTS "SupportTicketAttachment_uploadedById_fkey";
ALTER TABLE "SupportTicketAttachment" ADD CONSTRAINT "SupportTicketAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create Indexes for message and attachment tables safely
CREATE INDEX IF NOT EXISTS "SupportTicketMessage_ticketId_isInternal_idx" ON "SupportTicketMessage"("ticketId", "isInternal");
CREATE INDEX IF NOT EXISTS "SupportTicketMessage_authorId_createdAt_idx" ON "SupportTicketMessage"("authorId", "createdAt");

CREATE INDEX IF NOT EXISTS "SupportTicketAttachment_ticketId_idx" ON "SupportTicketAttachment"("ticketId");
CREATE INDEX IF NOT EXISTS "SupportTicketAttachment_uploadedById_idx" ON "SupportTicketAttachment"("uploadedById");
