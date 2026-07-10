-- CreateEnum
CREATE TYPE "IncubationBatchType" AS ENUM (
  'SCHOOL_COURSE',
  'GRADUATION_PROJECT',
  'CHALLENGE',
  'BRAND_BRIEF',
  'BUYER_SELECTION',
  'FABRIC_CLUSTER',
  'PRODUCTION_CLUSTER',
  'SMALL_BATCH_PILOT',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "IncubationBatchStatus" AS ENUM (
  'DRAFT',
  'RECRUITING',
  'EVALUATING',
  'MATCHING',
  'SAMPLING',
  'VALIDATING',
  'PRODUCTION_READY',
  'COMPLETED',
  'CANCELLED'
);

-- CreateEnum
CREATE TYPE "BatchWorkStatus" AS ENUM (
  'NOMINATED',
  'SUBMITTED',
  'SHORTLISTED',
  'SELECTED',
  'SAMPLING',
  'VALIDATING',
  'PRODUCTION_READY',
  'REMOVED'
);

-- CreateEnum
CREATE TYPE "BatchProviderRole" AS ENUM (
  'FABRIC_SUPPORT',
  'SAMPLE_SUPPORT',
  'PRODUCTION_SUPPORT',
  'BUYER',
  'SPONSOR',
  'MENTOR',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "BatchProviderStatus" AS ENUM (
  'INTERESTED',
  'APPLIED',
  'SHORTLISTED',
  'CONFIRMED',
  'DECLINED',
  'COMPLETED'
);

-- CreateTable
CREATE TABLE "IncubationBatch" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "description" TEXT,
  "type" "IncubationBatchType" NOT NULL,
  "status" "IncubationBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "organizerName" TEXT NOT NULL,
  "organizerType" TEXT,
  "schoolId" TEXT,
  "challengeId" TEXT,
  "coverImage" TEXT,
  "city" TEXT,
  "startDate" TIMESTAMP(3),
  "submissionDeadline" TIMESTAMP(3),
  "evaluationDeadline" TIMESTAMP(3),
  "targetCompletionDate" TIMESTAMP(3),
  "targetWorkCount" INTEGER,
  "targetSampleCount" INTEGER,
  "targetProductionQuantity" INTEGER,
  "confirmedProductionQuantity" INTEGER NOT NULL DEFAULT 0,
  "estimatedFabricMeters" DECIMAL(10,2),
  "targetCategories" TEXT,
  "targetMaterials" TEXT,
  "targetPriceRange" TEXT,
  "targetMarket" TEXT,
  "expectedRepeatOrder" BOOLEAN NOT NULL DEFAULT false,
  "adminApproved" BOOLEAN NOT NULL DEFAULT false,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "publicNote" TEXT,
  "adminNote" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IncubationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncubationBatchWork" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "status" "BatchWorkStatus" NOT NULL DEFAULT 'SUBMITTED',
  "nominationReason" TEXT,
  "reviewNote" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "selectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IncubationBatchWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncubationBatchProvider" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "role" "BatchProviderRole" NOT NULL,
  "status" "BatchProviderStatus" NOT NULL DEFAULT 'INTERESTED',
  "note" TEXT,
  "minimumQuantity" INTEGER,
  "maximumQuantity" INTEGER,
  "expectedPriceMin" DECIMAL(10,2),
  "expectedPriceMax" DECIMAL(10,2),
  "sampleLeadDays" INTEGER,
  "productionLeadDays" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IncubationBatchProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IncubationBatch_slug_key" ON "IncubationBatch"("slug");
CREATE INDEX "IncubationBatch_type_idx" ON "IncubationBatch"("type");
CREATE INDEX "IncubationBatch_status_idx" ON "IncubationBatch"("status");
CREATE INDEX "IncubationBatch_adminApproved_idx" ON "IncubationBatch"("adminApproved");
CREATE INDEX "IncubationBatch_featured_idx" ON "IncubationBatch"("featured");
CREATE INDEX "IncubationBatch_schoolId_idx" ON "IncubationBatch"("schoolId");
CREATE INDEX "IncubationBatch_challengeId_idx" ON "IncubationBatch"("challengeId");
CREATE INDEX "IncubationBatch_createdById_idx" ON "IncubationBatch"("createdById");
CREATE INDEX "IncubationBatch_submissionDeadline_idx" ON "IncubationBatch"("submissionDeadline");

CREATE UNIQUE INDEX "IncubationBatchWork_batchId_workId_key" ON "IncubationBatchWork"("batchId", "workId");
CREATE INDEX "IncubationBatchWork_batchId_idx" ON "IncubationBatchWork"("batchId");
CREATE INDEX "IncubationBatchWork_workId_idx" ON "IncubationBatchWork"("workId");
CREATE INDEX "IncubationBatchWork_status_idx" ON "IncubationBatchWork"("status");
CREATE INDEX "IncubationBatchWork_sortOrder_idx" ON "IncubationBatchWork"("sortOrder");

CREATE UNIQUE INDEX "IncubationBatchProvider_batchId_providerId_role_key" ON "IncubationBatchProvider"("batchId", "providerId", "role");
CREATE INDEX "IncubationBatchProvider_batchId_idx" ON "IncubationBatchProvider"("batchId");
CREATE INDEX "IncubationBatchProvider_providerId_idx" ON "IncubationBatchProvider"("providerId");
CREATE INDEX "IncubationBatchProvider_role_idx" ON "IncubationBatchProvider"("role");
CREATE INDEX "IncubationBatchProvider_status_idx" ON "IncubationBatchProvider"("status");

-- AddForeignKey
ALTER TABLE "IncubationBatch" ADD CONSTRAINT "IncubationBatch_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncubationBatch" ADD CONSTRAINT "IncubationBatch_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncubationBatch" ADD CONSTRAINT "IncubationBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncubationBatchWork" ADD CONSTRAINT "IncubationBatchWork_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "IncubationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncubationBatchWork" ADD CONSTRAINT "IncubationBatchWork_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncubationBatchProvider" ADD CONSTRAINT "IncubationBatchProvider_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "IncubationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncubationBatchProvider" ADD CONSTRAINT "IncubationBatchProvider_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
