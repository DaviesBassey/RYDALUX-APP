-- Section 18: Safety Module


-- Create SafetyFlagType enum
CREATE TYPE "SafetyFlagType" AS ENUM ('REPEAT_INCIDENT', 'PATTERN_DETECTED', 'HIGH_RISK_BEHAVIOR', 'SUSPICIOUS_ACTIVITY');

-- Create IncidentType enum
CREATE TYPE "IncidentType" AS ENUM ('HARASSMENT', 'UNSAFE_DRIVING', 'ASSAULT', 'PAYMENT_DISPUTE', 'VEHICLE_ISSUE', 'SUSPICIOUS_BEHAVIOR', 'EMERGENCY', 'OTHER');

-- Create SafetyFlag table for behavioral monitoring
CREATE TABLE "SafetyFlag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "flagType" "SafetyFlagType" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "reason" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SafetyFlag_pkey" PRIMARY KEY ("id")
);

-- Create ShareTripLink table for secure trip sharing
CREATE TABLE "ShareTripLink" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "shareToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "allowedData" TEXT[] NOT NULL DEFAULT ARRAY['location', 'driver', 'eta'],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareTripLink_pkey" PRIMARY KEY ("id")
);

-- Create SafetyCheckIn table for check-in events
CREATE TABLE "SafetyCheckIn" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "location" geography(Point,4326),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyCheckIn_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "SafetyFlag" ADD CONSTRAINT "SafetyFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShareTripLink" ADD CONSTRAINT "ShareTripLink_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShareTripLink" ADD CONSTRAINT "ShareTripLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SafetyCheckIn" ADD CONSTRAINT "SafetyCheckIn_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafetyCheckIn" ADD CONSTRAINT "SafetyCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafetyCheckIn" ADD CONSTRAINT "SafetyCheckIn_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for performance
CREATE INDEX "SafetyFlag_userId_isActive_idx" ON "SafetyFlag"("userId", "isActive");
CREATE UNIQUE INDEX "ShareTripLink_tripId_key" ON "ShareTripLink"("tripId");
CREATE UNIQUE INDEX "ShareTripLink_shareToken_key" ON "ShareTripLink"("shareToken");
CREATE INDEX "SafetyCheckIn_tripId_createdAt_idx" ON "SafetyCheckIn"("tripId", "createdAt");
CREATE INDEX "SafetyCheckIn_userId_createdAt_idx" ON "SafetyCheckIn"("userId", "createdAt");

-- Update SosEvent status default
ALTER TABLE "SosEvent" ALTER COLUMN "status" SET DEFAULT 'OPEN';
