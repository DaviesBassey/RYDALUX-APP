-- CreateEnum for ShipmentStatus (update existing)
ALTER TYPE "ShipmentStatus" RENAME TO "ShipmentStatus_old";
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'QUOTED', 'REQUESTED', 'DRIVER_ASSIGNED', 'PICKUP_ARRIVED', 'PICKUP_VERIFIED', 'IN_TRANSIT', 'DELIVERY_ARRIVED', 'DELIVERY_VERIFIED', 'DELIVERED', 'CANCELLED', 'DISPUTED', 'EXPIRED');
ALTER TABLE "Shipment" ALTER COLUMN "status" TYPE "ShipmentStatus" USING "status"::text::"ShipmentStatus";
DROP TYPE "ShipmentStatus_old";

-- CreateEnum for PackageCategory
CREATE TYPE "PackageCategory" AS ENUM ('DOCUMENT', 'SMALL_PACKAGE', 'MEDIUM_PACKAGE', 'LARGE_PACKAGE', 'FRAGILE', 'HIGH_VALUE', 'OTHER');

-- CreateEnum for ShipmentPriority
CREATE TYPE "ShipmentPriority" AS ENUM ('STANDARD', 'EXPRESS', 'SCHEDULED');

-- CreateEnum for ShipmentPhotoType
CREATE TYPE "ShipmentPhotoType" AS ENUM ('PACKAGE', 'PICKUP_PROOF', 'DELIVERY_PROOF');

-- CreateEnum for ShipmentOtpType
CREATE TYPE "ShipmentOtpType" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateTable ShipmentItem
CREATE TABLE "ShipmentItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipmentId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "weight" DOUBLE PRECISION,
    "value" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable ShipmentPhoto
CREATE TABLE "ShipmentPhoto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipmentId" UUID NOT NULL,
    "photoType" "ShipmentPhotoType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ShipmentPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable ShipmentTrackingEvent
CREATE TABLE "ShipmentTrackingEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipmentId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable ShipmentOtp
CREATE TABLE "ShipmentOtp" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipmentId" UUID NOT NULL,
    "otpType" "ShipmentOtpType" NOT NULL,
    "otpHash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable ShipmentQuote
CREATE TABLE "ShipmentQuote" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipmentId" UUID NOT NULL,
    "baseFare" DOUBLE PRECISION NOT NULL,
    "distanceFare" DOUBLE PRECISION NOT NULL,
    "weightFare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "surgeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "totalFare" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentQuote_pkey" PRIMARY KEY ("id")
);

-- Alter Shipment table to add new columns and enums
ALTER TABLE "Shipment" ADD COLUMN "senderUserId" UUID NOT NULL,
ADD COLUMN "senderRiderProfileId" UUID,
ADD COLUMN "driverProfileId" UUID,
ADD COLUMN "vehicleId" UUID,
ADD COLUMN "pickupAddress" TEXT NOT NULL,
ADD COLUMN "pickupLatitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN "pickupLongitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN "dropoffAddress" TEXT NOT NULL,
ADD COLUMN "dropoffLatitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN "dropoffLongitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN "packageCategory" "PackageCategory" NOT NULL,
ADD COLUMN "packageDescription" TEXT,
ADD COLUMN "declaredValue" DOUBLE PRECISION,
ADD COLUMN "priority" "ShipmentPriority" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "quotedFare" DOUBLE PRECISION,
ADD COLUMN "finalFare" DOUBLE PRECISION,
ADD COLUMN "paymentId" UUID UNIQUE,
ADD COLUMN "pickupOtpHash" TEXT,
ADD COLUMN "deliveryOtpHash" TEXT,
ADD COLUMN "pickupVerifiedAt" TIMESTAMP(3),
ADD COLUMN "deliveryVerifiedAt" TIMESTAMP(3),
ADD COLUMN "disputeReason" TEXT;

-- Drop old columns from Shipment if they exist
ALTER TABLE "Shipment" DROP COLUMN IF EXISTS "senderName",
DROP COLUMN IF EXISTS "packageSizeClass",
DROP COLUMN IF EXISTS "specialInstructions";

-- Add indexes to ShipmentItem
CREATE INDEX "ShipmentItem_shipmentId_idx" ON "ShipmentItem"("shipmentId");

-- Add indexes to ShipmentPhoto
CREATE INDEX "ShipmentPhoto_shipmentId_idx" ON "ShipmentPhoto"("shipmentId");

-- Add indexes to ShipmentTrackingEvent
CREATE INDEX "ShipmentTrackingEvent_shipmentId_idx" ON "ShipmentTrackingEvent"("shipmentId");
CREATE INDEX "ShipmentTrackingEvent_createdAt_idx" ON "ShipmentTrackingEvent"("createdAt");

-- Add indexes to ShipmentOtp
CREATE INDEX "ShipmentOtp_shipmentId_idx" ON "ShipmentOtp"("shipmentId");
CREATE INDEX "ShipmentOtp_expiresAt_idx" ON "ShipmentOtp"("expiresAt");
CREATE UNIQUE INDEX "ShipmentOtp_shipmentId_otpType_key" ON "ShipmentOtp"("shipmentId", "otpType");

-- Add indexes to ShipmentQuote
CREATE INDEX "ShipmentQuote_shipmentId_idx" ON "ShipmentQuote"("shipmentId");

-- Add indexes to Shipment
CREATE INDEX "Shipment_senderUserId_idx" ON "Shipment"("senderUserId");
CREATE INDEX "Shipment_driverProfileId_idx" ON "Shipment"("driverProfileId");
CREATE INDEX "Shipment_paymentId_idx" ON "Shipment"("paymentId");
CREATE INDEX "Shipment_createdAt_idx" ON "Shipment"("createdAt");

-- Update Shipment index
DROP INDEX IF EXISTS "Shipment_tripId_idx";

-- Add foreign keys
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShipmentPhoto" ADD CONSTRAINT "ShipmentPhoto_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShipmentTrackingEvent" ADD CONSTRAINT "ShipmentTrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShipmentOtp" ADD CONSTRAINT "ShipmentOtp_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShipmentQuote" ADD CONSTRAINT "ShipmentQuote_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_senderRiderProfileId_fkey" FOREIGN KEY ("senderRiderProfileId") REFERENCES "RiderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add shipmentId to SupportTicket if not exists
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "shipmentId" UUID;
CREATE INDEX IF NOT EXISTS "SupportTicket_shipmentId_idx" ON "SupportTicket"("shipmentId");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add recipientName and recipientPhone columns if they don't exist
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "recipientName" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "recipientPhone" TEXT NOT NULL DEFAULT '';

-- Remove defaults after adding columns
ALTER TABLE "Shipment" ALTER COLUMN "recipientName" DROP DEFAULT,
ALTER COLUMN "recipientPhone" DROP DEFAULT;
