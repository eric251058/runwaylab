-- V2.0B.3.4 - V2.3 unified foundation.
-- Forward-compatible only: no table drops, truncates, deletes, or production data rewrites.

ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD CONSTRAINT "User_email_or_phone_required" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);

ALTER TYPE "CollaborationProjectStatus" ADD VALUE IF NOT EXISTS 'SEEKING_OWNER';
ALTER TYPE "CollaborationProjectStatus" ADD VALUE IF NOT EXISTS 'PLANNING';
ALTER TYPE "CollaborationProjectStatus" ADD VALUE IF NOT EXISTS 'SEEKING_PROPOSALS';
ALTER TYPE "CollaborationProjectStatus" ADD VALUE IF NOT EXISTS 'SAMPLE_PREPARATION';
ALTER TYPE "CollaborationProjectStatus" ADD VALUE IF NOT EXISTS 'SAMPLE_REVIEW';
ALTER TYPE "CollaborationProjectStatus" ADD VALUE IF NOT EXISTS 'PREORDER_READY';
ALTER TYPE "CollaborationProjectStatus" ADD VALUE IF NOT EXISTS 'PREORDER_OPEN';
ALTER TYPE "CollaborationProjectStatus" ADD VALUE IF NOT EXISTS 'PRODUCTION';
ALTER TYPE "CollaborationProjectStatus" ADD VALUE IF NOT EXISTS 'QUALITY_CHECK';
ALTER TYPE "CollaborationProjectStatus" ADD VALUE IF NOT EXISTS 'SHIPPING';
ALTER TYPE "CollaborationProjectStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

ALTER TYPE "ProjectOrderStatus" ADD VALUE IF NOT EXISTS 'RESERVATION';
ALTER TYPE "ProjectOrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
ALTER TYPE "ProjectOrderStatus" ADD VALUE IF NOT EXISTS 'PRODUCTION';
ALTER TYPE "ProjectOrderStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';
ALTER TYPE "ProjectOrderStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
ALTER TYPE "ProjectOrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

CREATE TYPE "WorkDemandIntentStatus" AS ENUM ('ACTIVE', 'CANCELLED');
CREATE TYPE "DesignerProjectPreference" AS ENUM ('DISPLAY_ONLY', 'COLLECT_DEMAND', 'SELF_MANAGE', 'SEEK_OWNER', 'PAUSED');
CREATE TYPE "CollaborationProjectVisibility" AS ENUM ('PRIVATE', 'PARTICIPANTS', 'PUBLIC');
CREATE TYPE "ProjectDesignAuthorizationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED');
CREATE TYPE "ProjectMilestoneStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');
CREATE TYPE "ProjectMilestoneVisibility" AS ENUM ('PRIVATE', 'PARTICIPANTS', 'PUBLIC');
CREATE TYPE "ProjectIssueStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');
CREATE TYPE "ProjectIssueType" AS ENUM ('NO_UPDATE', 'DELAY', 'OWNER_UNREACHABLE', 'QUALITY_CONCERN', 'DESCRIPTION_MISMATCH', 'COPYRIGHT', 'PROVIDER_BREACH', 'OTHER');
CREATE TYPE "ProjectProductStatus" AS ENUM ('DRAFT', 'REVIEWING', 'APPROVED', 'PREORDER_OPEN', 'PAUSED', 'SOLD_OUT', 'ARCHIVED');
CREATE TYPE "ProjectOrderPaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE "ProjectOrderFulfillmentStatus" AS ENUM ('NOT_STARTED', 'PRODUCTION', 'QUALITY_CHECK', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'EXCEPTION');

CREATE TABLE "WorkDemandIntent" (
  "id" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "preferredSizes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "preferredColors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "priceMin" INTEGER,
  "priceMax" INTEGER,
  "region" TEXT,
  "notifyWhenAvailable" BOOLEAN NOT NULL DEFAULT true,
  "status" "WorkDemandIntentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkDemandIntent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkDemandIntent" ADD CONSTRAINT "WorkDemandIntent_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkDemandIntent" ADD CONSTRAINT "WorkDemandIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "WorkDemandIntent_workId_userId_key" ON "WorkDemandIntent"("workId", "userId");
CREATE INDEX "WorkDemandIntent_workId_idx" ON "WorkDemandIntent"("workId");
CREATE INDEX "WorkDemandIntent_userId_idx" ON "WorkDemandIntent"("userId");
CREATE INDEX "WorkDemandIntent_status_idx" ON "WorkDemandIntent"("status");
CREATE INDEX "WorkDemandIntent_createdAt_idx" ON "WorkDemandIntent"("createdAt");

ALTER TABLE "ProviderWorkProposal" ADD COLUMN "projectId" TEXT;
ALTER TABLE "ProviderWorkProposal" ADD COLUMN "summary" TEXT;
ALTER TABLE "ProviderWorkProposal" ADD COLUMN "priceMin" INTEGER;
ALTER TABLE "ProviderWorkProposal" ADD COLUMN "priceMax" INTEGER;
ALTER TABLE "ProviderWorkProposal" ADD COLUMN "leadTimeDays" INTEGER;
ALTER TABLE "ProviderWorkProposal" ADD COLUMN "minimumQuantity" INTEGER;
ALTER TABLE "ProviderWorkProposal" ADD COLUMN "validUntil" TIMESTAMP(3);
ALTER TABLE "ProviderWorkProposal" ADD COLUMN "evidenceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ProviderWorkProposal" ADD CONSTRAINT "ProviderWorkProposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CollaborationProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ProviderWorkProposal_projectId_idx" ON "ProviderWorkProposal"("projectId");

ALTER TABLE "CollaborationProject" ADD COLUMN "ownerUserId" TEXT;
ALTER TABLE "CollaborationProject" ADD COLUMN "ownerProviderId" TEXT;
ALTER TABLE "CollaborationProject" ADD COLUMN "summary" TEXT;
ALTER TABLE "CollaborationProject" ADD COLUMN "visibility" "CollaborationProjectVisibility" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "CollaborationProject" ADD COLUMN "targetPriceMin" INTEGER;
ALTER TABLE "CollaborationProject" ADD COLUMN "targetPriceMax" INTEGER;
ALTER TABLE "CollaborationProject" ADD COLUMN "applicationDeadline" TIMESTAMP(3);
ALTER TABLE "CollaborationProject" ADD COLUMN "estimatedShipDate" TIMESTAMP(3);
ALTER TABLE "CollaborationProject" ADD COLUMN "responsibilityText" TEXT;
ALTER TABLE "CollaborationProject" ADD COLUMN "designerAuthorizationStatus" "ProjectDesignAuthorizationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "CollaborationProject" ADD COLUMN "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "CollaborationProject" ADD COLUMN "designerPreference" "DesignerProjectPreference" NOT NULL DEFAULT 'COLLECT_DEMAND';
ALTER TABLE "CollaborationProject" ADD CONSTRAINT "CollaborationProject_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollaborationProject" ADD CONSTRAINT "CollaborationProject_ownerProviderId_fkey" FOREIGN KEY ("ownerProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "CollaborationProject_ownerUserId_idx" ON "CollaborationProject"("ownerUserId");
CREATE INDEX "CollaborationProject_ownerProviderId_idx" ON "CollaborationProject"("ownerProviderId");
CREATE INDEX "CollaborationProject_visibility_idx" ON "CollaborationProject"("visibility");
CREATE INDEX "CollaborationProject_reviewStatus_idx" ON "CollaborationProject"("reviewStatus");
CREATE INDEX "CollaborationProject_designerAuthorizationStatus_idx" ON "CollaborationProject"("designerAuthorizationStatus");

CREATE TABLE "ProjectDesignAuthorization" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "designerUserId" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "royaltyDescription" TEXT,
  "status" "ProjectDesignAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "termsVersion" TEXT NOT NULL DEFAULT 'v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectDesignAuthorization_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProjectDesignAuthorization" ADD CONSTRAINT "ProjectDesignAuthorization_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CollaborationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDesignAuthorization" ADD CONSTRAINT "ProjectDesignAuthorization_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDesignAuthorization" ADD CONSTRAINT "ProjectDesignAuthorization_designerUserId_fkey" FOREIGN KEY ("designerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDesignAuthorization" ADD CONSTRAINT "ProjectDesignAuthorization_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ProjectDesignAuthorization_projectId_key" ON "ProjectDesignAuthorization"("projectId");
CREATE INDEX "ProjectDesignAuthorization_projectId_idx" ON "ProjectDesignAuthorization"("projectId");
CREATE INDEX "ProjectDesignAuthorization_workId_idx" ON "ProjectDesignAuthorization"("workId");
CREATE INDEX "ProjectDesignAuthorization_designerUserId_idx" ON "ProjectDesignAuthorization"("designerUserId");
CREATE INDEX "ProjectDesignAuthorization_ownerUserId_idx" ON "ProjectDesignAuthorization"("ownerUserId");
CREATE INDEX "ProjectDesignAuthorization_status_idx" ON "ProjectDesignAuthorization"("status");

CREATE TABLE "ProjectMilestone" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "status" "ProjectMilestoneStatus" NOT NULL DEFAULT 'TODO',
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "note" TEXT,
  "evidenceUrl" TEXT,
  "visibility" "ProjectMilestoneVisibility" NOT NULL DEFAULT 'PARTICIPANTS',
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CollaborationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");
CREATE INDEX "ProjectMilestone_status_idx" ON "ProjectMilestone"("status");
CREATE INDEX "ProjectMilestone_visibility_idx" ON "ProjectMilestone"("visibility");
CREATE INDEX "ProjectMilestone_createdByUserId_idx" ON "ProjectMilestone"("createdByUserId");

CREATE TABLE "ProjectIssue" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "type" "ProjectIssueType" NOT NULL DEFAULT 'OTHER',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "ProjectIssueStatus" NOT NULL DEFAULT 'OPEN',
  "adminNote" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectIssue_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CollaborationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "ProjectIssue_projectId_idx" ON "ProjectIssue"("projectId");
CREATE INDEX "ProjectIssue_reporterId_idx" ON "ProjectIssue"("reporterId");
CREATE INDEX "ProjectIssue_type_idx" ON "ProjectIssue"("type");
CREATE INDEX "ProjectIssue_status_idx" ON "ProjectIssue"("status");

CREATE TABLE "ProjectProduct" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "workId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "materialDescription" TEXT,
  "careInstructions" TEXT,
  "price" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CNY',
  "targetQuantity" INTEGER,
  "preorderDeadline" TIMESTAMP(3),
  "estimatedShipDate" TIMESTAMP(3),
  "imageStage" TEXT,
  "status" "ProjectProductStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectProduct_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProjectProduct" ADD CONSTRAINT "ProjectProduct_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CollaborationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectProduct" ADD CONSTRAINT "ProjectProduct_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ProjectProduct_projectId_idx" ON "ProjectProduct"("projectId");
CREATE INDEX "ProjectProduct_workId_idx" ON "ProjectProduct"("workId");
CREATE INDEX "ProjectProduct_status_idx" ON "ProjectProduct"("status");

CREATE TABLE "ProjectSku" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "skuCode" TEXT,
  "priceOverride" INTEGER,
  "capacity" INTEGER,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectSku_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProjectSku" ADD CONSTRAINT "ProjectSku_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProjectProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ProjectSku_productId_size_color_key" ON "ProjectSku"("productId", "size", "color");
CREATE INDEX "ProjectSku_productId_idx" ON "ProjectSku"("productId");
CREATE INDEX "ProjectSku_enabled_idx" ON "ProjectSku"("enabled");

ALTER TABLE "ProjectOrder" ADD COLUMN "productId" TEXT;
ALTER TABLE "ProjectOrder" ADD COLUMN "skuId" TEXT;
ALTER TABLE "ProjectOrder" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ProjectOrder" ADD COLUMN "unitPrice" INTEGER;
ALTER TABLE "ProjectOrder" ADD COLUMN "totalAmount" INTEGER;
ALTER TABLE "ProjectOrder" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'CNY';
ALTER TABLE "ProjectOrder" ADD COLUMN "paymentStatus" "ProjectOrderPaymentStatus" NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "ProjectOrder" ADD COLUMN "fulfillmentStatus" "ProjectOrderFulfillmentStatus" NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "ProjectOrder" ADD COLUMN "shippingAddressSnapshot" JSONB;
ALTER TABLE "ProjectOrder" ADD COLUMN "buyerNote" TEXT;
ALTER TABLE "ProjectOrder" ADD COLUMN "trackingCompany" TEXT;
ALTER TABLE "ProjectOrder" ADD COLUMN "trackingNumber" TEXT;
ALTER TABLE "ProjectOrder" ADD COLUMN "estimatedShipDate" TIMESTAMP(3);
ALTER TABLE "ProjectOrder" ADD COLUMN "exceptionNote" TEXT;
ALTER TABLE "ProjectOrder" ADD CONSTRAINT "ProjectOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProjectProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectOrder" ADD CONSTRAINT "ProjectOrder_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProjectSku"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ProjectOrder_productId_idx" ON "ProjectOrder"("productId");
CREATE INDEX "ProjectOrder_skuId_idx" ON "ProjectOrder"("skuId");
CREATE INDEX "ProjectOrder_paymentStatus_idx" ON "ProjectOrder"("paymentStatus");
CREATE INDEX "ProjectOrder_fulfillmentStatus_idx" ON "ProjectOrder"("fulfillmentStatus");
