CREATE TYPE "LimitedPreorderStatus" AS ENUM (
  'NOT_STARTED',
  'OPEN',
  'PAUSED',
  'GOAL_REACHED',
  'FAILED',
  'PRODUCTION',
  'CANCELLED',
  'CLOSED'
);

CREATE TYPE "LimitedPreorderQualificationMode" AS ENUM (
  'CONFIRMED_ORDER',
  'PAID_ORDER'
);

ALTER TABLE "PresaleCampaign"
  ADD COLUMN "preorderStatus" "LimitedPreorderStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "preorderQualificationMode" "LimitedPreorderQualificationMode" NOT NULL DEFAULT 'CONFIRMED_ORDER',
  ADD COLUMN "preorderTargetQuantity" INTEGER,
  ADD COLUMN "preorderCapacity" INTEGER,
  ADD COLUMN "preorderDeadline" TIMESTAMP(3),
  ADD COLUMN "preorderTermsVersion" TEXT NOT NULL DEFAULT 'limited-preorder-v1',
  ADD COLUMN "preorderTermsText" TEXT,
  ADD COLUMN "preorderPaymentInstructions" TEXT,
  ADD COLUMN "preorderOpenedAt" TIMESTAMP(3),
  ADD COLUMN "preorderPausedAt" TIMESTAMP(3),
  ADD COLUMN "preorderDecidedAt" TIMESTAMP(3),
  ADD COLUMN "preorderProductionStartedAt" TIMESTAMP(3),
  ADD COLUMN "preorderClosedAt" TIMESTAMP(3),
  ADD COLUMN "preorderDecisionReason" TEXT,
  ADD COLUMN "preorderPublicNotice" TEXT;

ALTER TABLE "ProjectProduct"
  ADD COLUMN "preorderLimit" INTEGER,
  ADD COLUMN "preorderCampaignId" TEXT;

ALTER TABLE "ProjectOrder"
  ADD COLUMN "preorderCampaignId" TEXT,
  ADD COLUMN "termsTextSnapshot" TEXT,
  ADD COLUMN "paymentInstructionsSnapshot" TEXT,
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);

ALTER TABLE "PresaleCampaign"
  ADD CONSTRAINT "PresaleCampaign_preorder_quantity_check"
  CHECK (
    ("preorderTargetQuantity" IS NULL OR "preorderTargetQuantity" > 0)
    AND ("preorderCapacity" IS NULL OR "preorderCapacity" > 0)
    AND (
      "preorderTargetQuantity" IS NULL
      OR "preorderCapacity" IS NULL
      OR "preorderTargetQuantity" <= "preorderCapacity"
    )
  );

ALTER TABLE "ProjectProduct"
  ADD CONSTRAINT "ProjectProduct_preorder_limit_check"
  CHECK ("preorderLimit" IS NULL OR "preorderLimit" > 0);

CREATE INDEX "PresaleCampaign_preorderStatus_idx"
  ON "PresaleCampaign"("preorderStatus");

CREATE INDEX "ProjectOrder_preorderCampaignId_status_idx"
  ON "ProjectOrder"("preorderCampaignId", "status");

CREATE INDEX "ProjectProduct_preorderCampaignId_status_idx"
  ON "ProjectProduct"("preorderCampaignId", "status");

ALTER TABLE "ProjectProduct"
  ADD CONSTRAINT "ProjectProduct_preorderCampaignId_fkey"
  FOREIGN KEY ("preorderCampaignId") REFERENCES "PresaleCampaign"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectOrder"
  ADD CONSTRAINT "ProjectOrder_preorderCampaignId_fkey"
  FOREIGN KEY ("preorderCampaignId") REFERENCES "PresaleCampaign"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
