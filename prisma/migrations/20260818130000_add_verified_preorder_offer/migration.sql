-- Bind an author's decision to the exact no-payment offer they reviewed.
ALTER TABLE "ProjectDesignAuthorization"
ADD COLUMN "offerHash" TEXT,
ADD COLUMN "offerSnapshot" JSONB;

-- Record evidence that a real person, rather than a generic status dropdown,
-- confirmed a limited-preorder order intention.
CREATE TYPE "ProjectOrderConfirmationChannel" AS ENUM ('PHONE', 'WECHAT', 'EMAIL', 'IN_PERSON', 'OTHER');

ALTER TABLE "ProjectOrder"
ADD COLUMN "confirmedAt" TIMESTAMP(3),
ADD COLUMN "confirmedById" TEXT,
ADD COLUMN "confirmationChannel" "ProjectOrderConfirmationChannel",
ADD COLUMN "confirmationEvidenceRef" TEXT,
ADD COLUMN "confirmationSummary" TEXT;

CREATE INDEX "ProjectOrder_confirmedById_idx" ON "ProjectOrder"("confirmedById");
CREATE INDEX "ProjectOrder_confirmedAt_idx" ON "ProjectOrder"("confirmedAt");

ALTER TABLE "ProjectOrder"
ADD CONSTRAINT "ProjectOrder_confirmedById_fkey"
FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
