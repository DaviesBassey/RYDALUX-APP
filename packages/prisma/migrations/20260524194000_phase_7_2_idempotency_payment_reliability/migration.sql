-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "IdempotencyKey" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "actorId" UUID,
  "requestHash" TEXT NOT NULL,
  "status" "IdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "responseStatus" INTEGER,
  "responseBody" JSONB,
  "errorBody" JSONB,
  "lockedUntil" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderEvent" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "reference" TEXT,
  "payloadHash" TEXT NOT NULL,
  "payload" JSONB,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_scope_key_key" ON "IdempotencyKey"("scope", "key");
CREATE INDEX "IdempotencyKey_actorId_scope_idx" ON "IdempotencyKey"("actorId", "scope");
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");
CREATE INDEX "IdempotencyKey_status_lockedUntil_idx" ON "IdempotencyKey"("status", "lockedUntil");
CREATE UNIQUE INDEX "ProviderEvent_provider_providerEventId_key" ON "ProviderEvent"("provider", "providerEventId");
CREATE INDEX "ProviderEvent_provider_reference_idx" ON "ProviderEvent"("provider", "reference");
CREATE INDEX "ProviderEvent_processedAt_idx" ON "ProviderEvent"("processedAt");
