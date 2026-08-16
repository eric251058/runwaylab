ALTER TABLE "ProjectOrder"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "productSnapshot" JSONB,
  ADD COLUMN "skuSnapshot" JSONB,
  ADD COLUMN "preorderDeadlineSnapshot" TIMESTAMP(3),
  ADD COLUMN "capacitySnapshot" INTEGER,
  ADD COLUMN "termsVersion" TEXT NOT NULL DEFAULT 'limited-preorder-v1',
  ADD COLUMN "reservationExpiresAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancellationReason" TEXT;

CREATE UNIQUE INDEX "ProjectOrder_idempotencyKey_key" ON "ProjectOrder"("idempotencyKey");
CREATE INDEX "ProjectOrder_reservationExpiresAt_idx" ON "ProjectOrder"("reservationExpiresAt");
