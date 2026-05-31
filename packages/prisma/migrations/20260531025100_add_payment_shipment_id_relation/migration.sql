-- AlterTable: Add shipmentId column to Payment if it does not exist
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "shipmentId" UUID;

-- CreateIndex: Create unique index on Payment(shipmentId) if not exists
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_shipmentId_key" ON "Payment"("shipmentId");

-- CreateIndex: Create regular index on Payment(shipmentId) if not exists
CREATE INDEX IF NOT EXISTS "Payment_shipmentId_idx" ON "Payment"("shipmentId");

-- AddForeignKey: Add constraint referencing Shipment(id) if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'Payment_shipmentId_fkey'
    ) THEN
        ALTER TABLE "Payment" 
        ADD CONSTRAINT "Payment_shipmentId_fkey" 
        FOREIGN KEY ("shipmentId") 
        REFERENCES "Shipment"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;
