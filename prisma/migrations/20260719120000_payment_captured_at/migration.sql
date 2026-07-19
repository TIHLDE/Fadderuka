-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "capturedAt" TIMESTAMP(3);

-- Backfill: `updatedAt` was written by settlePayment in the same moment the
-- capture succeeded, so it is an accurate capture time for existing rows.
-- Exact timestamps from the Vipps portal can be layered on afterwards via
-- scripts/backfill-captured-at.ts.
UPDATE "Payment"
SET "capturedAt" = "updatedAt"
WHERE "status" = 'CAPTURED' AND "capturedAt" IS NULL;
