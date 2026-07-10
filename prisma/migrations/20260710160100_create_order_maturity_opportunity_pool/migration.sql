-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('DISPLAY_ONLY', 'SAMPLE_READY', 'SMALL_BATCH_READY', 'SCALE_READY');

-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('NOT_STARTED', 'PLANNING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ProviderOrderPreference" AS ENUM ('SAMPLE_ONLY', 'SMALL_BATCH', 'MEDIUM_ORDER', 'LARGE_ORDER', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "ProviderCapacityStatus" AS ENUM ('AVAILABLE', 'LIMITED', 'FULL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ProviderOpportunityInterestType" AS ENUM ('INTERESTED', 'NEED_MORE_INFO', 'CAN_SAMPLE', 'CAN_SMALL_BATCH', 'CAN_SCALE', 'NOT_SUITABLE');

-- CreateEnum
CREATE TYPE "ProviderOpportunityInterestStatus" AS ENUM ('SUBMITTED', 'REVIEWED', 'SHORTLISTED', 'DECLINED', 'CLOSED');

-- AlterTable: Provider capability fields with safe defaults for existing rows.
ALTER TABLE "Provider"
ADD COLUMN "orderPreference" "ProviderOrderPreference" NOT NULL DEFAULT 'FLEXIBLE',
ADD COLUMN "minimumOrderQuantity" INTEGER,
ADD COLUMN "maximumOrderQuantity" INTEGER,
ADD COLUMN "acceptsSampling" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "acceptsSmallBatch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "acceptsLargeOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sampleLeadDays" INTEGER,
ADD COLUMN "productionLeadDays" INTEGER,
ADD COLUMN "capacityStatus" "ProviderCapacityStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "supportedCategories" TEXT,
ADD COLUMN "preferredMaterials" TEXT,
ADD COLUMN "preferredRegions" TEXT,
ADD COLUMN "opportunityVisible" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "WorkOpportunityProfile" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'DISPLAY_ONLY',
    "targetQuantity" INTEGER,
    "targetUnitCost" DECIMAL(10,2),
    "targetRetailPrice" DECIMAL(10,2),
    "sampleBudget" DECIMAL(10,2),
    "sampleStatus" "SampleStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "fabricStatus" "FabricStatus" NOT NULL DEFAULT 'UNKNOWN',
    "targetLaunchDate" TIMESTAMP(3),
    "targetDeliveryDate" TIMESTAMP(3),
    "expectedFabricMeters" DECIMAL(10,2),
    "expectedReorder" BOOLEAN NOT NULL DEFAULT false,
    "buyerInterestCount" INTEGER NOT NULL DEFAULT 0,
    "confirmedBuyerQuantity" INTEGER NOT NULL DEFAULT 0,
    "adminApproved" BOOLEAN NOT NULL DEFAULT false,
    "adminNote" TEXT,
    "designerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOpportunityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOpportunityInterest" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "interestType" "ProviderOpportunityInterestType" NOT NULL,
    "note" TEXT,
    "expectedPriceMin" DECIMAL(10,2),
    "expectedPriceMax" DECIMAL(10,2),
    "minimumQuantity" INTEGER,
    "leadDays" INTEGER,
    "status" "ProviderOpportunityInterestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderOpportunityInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkOpportunityProfile_workId_key" ON "WorkOpportunityProfile"("workId");
CREATE INDEX "WorkOpportunityProfile_stage_idx" ON "WorkOpportunityProfile"("stage");
CREATE INDEX "WorkOpportunityProfile_sampleStatus_idx" ON "WorkOpportunityProfile"("sampleStatus");
CREATE INDEX "WorkOpportunityProfile_fabricStatus_idx" ON "WorkOpportunityProfile"("fabricStatus");
CREATE INDEX "WorkOpportunityProfile_adminApproved_idx" ON "WorkOpportunityProfile"("adminApproved");

CREATE UNIQUE INDEX "ProviderOpportunityInterest_providerId_workId_key" ON "ProviderOpportunityInterest"("providerId", "workId");
CREATE INDEX "ProviderOpportunityInterest_providerId_idx" ON "ProviderOpportunityInterest"("providerId");
CREATE INDEX "ProviderOpportunityInterest_workId_idx" ON "ProviderOpportunityInterest"("workId");
CREATE INDEX "ProviderOpportunityInterest_interestType_idx" ON "ProviderOpportunityInterest"("interestType");
CREATE INDEX "ProviderOpportunityInterest_status_idx" ON "ProviderOpportunityInterest"("status");

CREATE INDEX "Provider_opportunityVisible_idx" ON "Provider"("opportunityVisible");
CREATE INDEX "Provider_orderPreference_idx" ON "Provider"("orderPreference");
CREATE INDEX "Provider_capacityStatus_idx" ON "Provider"("capacityStatus");

-- AddForeignKey
ALTER TABLE "WorkOpportunityProfile" ADD CONSTRAINT "WorkOpportunityProfile_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderOpportunityInterest" ADD CONSTRAINT "ProviderOpportunityInterest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderOpportunityInterest" ADD CONSTRAINT "ProviderOpportunityInterest_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
