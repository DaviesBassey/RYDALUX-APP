-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('REQUESTED', 'DRIVER_EN_ROUTE', 'AT_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProofType" AS ENUM ('PHOTO_URL');

-- CreateTable
CREATE TABLE "Shipment" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "senderName" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "packageDescription" TEXT,
    "packageSizeClass" TEXT NOT NULL DEFAULT 'SMALL',
    "specialInstructions" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentProof" (
    "id" UUID NOT NULL,
    "shipmentId" UUID NOT NULL,
    "proofType" "ProofType" NOT NULL DEFAULT 'PHOTO_URL',
    "url" TEXT NOT NULL,
    "notes" TEXT,
    "submittedBy" UUID NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ShipmentProof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_tripId_key" ON "Shipment"("tripId");
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");
CREATE INDEX "Shipment_tripId_idx" ON "Shipment"("tripId");
CREATE INDEX "ShipmentProof_shipmentId_idx" ON "ShipmentProof"("shipmentId");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentProof" ADD CONSTRAINT "ShipmentProof_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
