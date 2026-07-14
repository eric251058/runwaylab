-- CreateEnum
CREATE TYPE "ProviderAvailabilityStatus" AS ENUM ('OPEN', 'BUSY', 'PAUSED');

-- CreateEnum
CREATE TYPE "ProviderShowcaseType" AS ENUM ('SAMPLE_CASE', 'PRODUCTION_CASE', 'SERVICE');

-- CreateEnum
CREATE TYPE "ProviderShowcaseStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProviderInquiryType" AS ENUM ('GENERAL', 'FABRIC_SAMPLE', 'SAMPLE_DEVELOPMENT', 'SMALL_BATCH', 'MASS_PRODUCTION');

-- AlterTable
ALTER TABLE "Provider"
ADD COLUMN "ownerId" TEXT,
ADD COLUMN "tagline" TEXT,
ADD COLUMN "whatsapp" TEXT,
ADD COLUMN "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "materials" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "techniques" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "serviceRegions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "moqMin" INTEGER,
ADD COLUMN "capacityText" TEXT,
ADD COLUMN "availabilityStatus" "ProviderAvailabilityStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN "publicContactEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProviderApplication" ADD COLUMN "userId" TEXT;

-- AlterTable
ALTER TABLE "Fabric" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "CooperationRequest"
ADD COLUMN "providerId" TEXT,
ADD COLUMN "fabricId" TEXT,
ADD COLUMN "showcaseItemId" TEXT,
ADD COLUMN "requestType" "ProviderInquiryType" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "contactPreference" TEXT,
ADD COLUMN "quantity" INTEGER,
ADD COLUMN "expectedDate" TIMESTAMP(3),
ADD COLUMN "providerResponse" TEXT,
ADD COLUMN "viewedAt" TIMESTAMP(3),
ADD COLUMN "respondedAt" TIMESTAMP(3);

ALTER TABLE "CooperationRequest" DROP CONSTRAINT "CooperationRequest_workId_fkey";
ALTER TABLE "CooperationRequest" ALTER COLUMN "workId" DROP NOT NULL;
ALTER TABLE "CooperationRequest" ADD CONSTRAINT "CooperationRequest_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ProviderShowcaseItem" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "type" "ProviderShowcaseType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "materials" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "techniques" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "quantityRange" TEXT,
    "moqMin" INTEGER,
    "leadTimeDays" INTEGER,
    "capacityText" TEXT,
    "status" "ProviderShowcaseStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewNote" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderShowcaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Provider_ownerId_idx" ON "Provider"("ownerId");
CREATE INDEX "Provider_availabilityStatus_idx" ON "Provider"("availabilityStatus");
CREATE INDEX "ProviderApplication_userId_idx" ON "ProviderApplication"("userId");
CREATE INDEX "ProviderShowcaseItem_providerId_idx" ON "ProviderShowcaseItem"("providerId");
CREATE INDEX "ProviderShowcaseItem_type_idx" ON "ProviderShowcaseItem"("type");
CREATE INDEX "ProviderShowcaseItem_status_idx" ON "ProviderShowcaseItem"("status");
CREATE INDEX "ProviderShowcaseItem_isFeatured_idx" ON "ProviderShowcaseItem"("isFeatured");
CREATE INDEX "ProviderShowcaseItem_publishedAt_idx" ON "ProviderShowcaseItem"("publishedAt");
CREATE INDEX "CooperationRequest_providerId_idx" ON "CooperationRequest"("providerId");
CREATE INDEX "CooperationRequest_fabricId_idx" ON "CooperationRequest"("fabricId");
CREATE INDEX "CooperationRequest_showcaseItemId_idx" ON "CooperationRequest"("showcaseItemId");
CREATE INDEX "CooperationRequest_requestType_idx" ON "CooperationRequest"("requestType");
CREATE INDEX "CooperationRequest_createdAt_idx" ON "CooperationRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderApplication" ADD CONSTRAINT "ProviderApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderShowcaseItem" ADD CONSTRAINT "ProviderShowcaseItem_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderShowcaseItem" ADD CONSTRAINT "ProviderShowcaseItem_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CooperationRequest" ADD CONSTRAINT "CooperationRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CooperationRequest" ADD CONSTRAINT "CooperationRequest_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CooperationRequest" ADD CONSTRAINT "CooperationRequest_showcaseItemId_fkey" FOREIGN KEY ("showcaseItemId") REFERENCES "ProviderShowcaseItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
