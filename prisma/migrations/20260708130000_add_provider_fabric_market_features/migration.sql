-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('FABRIC_SUPPLIER', 'SAMPLE_STUDIO', 'FACTORY', 'BUYER', 'OTHER');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProviderApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FabricStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProviderWorkProposalType" AS ENUM ('FABRIC', 'SAMPLE', 'PRODUCTION', 'BUYER_INTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ProviderWorkProposalStatus" AS ENUM ('PENDING', 'SHORTLISTED', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "type" "ProviderType" NOT NULL,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "city" TEXT,
    "province" TEXT,
    "country" TEXT NOT NULL DEFAULT 'China',
    "description" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "wechat" TEXT,
    "website" TEXT,
    "tags" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProviderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderApplication" (
    "id" TEXT NOT NULL,
    "providerType" "ProviderType" NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "wechat" TEXT,
    "city" TEXT,
    "description" TEXT,
    "status" "ProviderApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fabric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "code" TEXT,
    "providerId" TEXT,
    "imageUrl" TEXT,
    "composition" TEXT,
    "weight" TEXT,
    "width" TEXT,
    "color" TEXT,
    "texture" TEXT,
    "season" TEXT,
    "usage" TEXT,
    "description" TEXT,
    "priceNote" TEXT,
    "moqNote" TEXT,
    "tags" TEXT[],
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" "FabricStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fabric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkFabricRecommendation" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "fabricId" TEXT NOT NULL,
    "providerId" TEXT,
    "reason" TEXT,
    "recommendedBy" TEXT,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkFabricRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderWorkProposal" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "type" "ProviderWorkProposalType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "estimatedPrice" TEXT,
    "estimatedTime" TEXT,
    "moq" TEXT,
    "attachments" TEXT[],
    "status" "ProviderWorkProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderWorkProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");
CREATE INDEX "Provider_type_idx" ON "Provider"("type");
CREATE INDEX "Provider_status_idx" ON "Provider"("status");
CREATE INDEX "Provider_isFeatured_idx" ON "Provider"("isFeatured");
CREATE INDEX "Provider_isVerified_idx" ON "Provider"("isVerified");

-- CreateIndex
CREATE INDEX "ProviderApplication_providerType_idx" ON "ProviderApplication"("providerType");
CREATE INDEX "ProviderApplication_status_idx" ON "ProviderApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Fabric_slug_key" ON "Fabric"("slug");
CREATE INDEX "Fabric_providerId_idx" ON "Fabric"("providerId");
CREATE INDEX "Fabric_status_idx" ON "Fabric"("status");
CREATE INDEX "Fabric_isFeatured_idx" ON "Fabric"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "WorkFabricRecommendation_workId_fabricId_key" ON "WorkFabricRecommendation"("workId", "fabricId");
CREATE INDEX "WorkFabricRecommendation_workId_idx" ON "WorkFabricRecommendation"("workId");
CREATE INDEX "WorkFabricRecommendation_fabricId_idx" ON "WorkFabricRecommendation"("fabricId");
CREATE INDEX "WorkFabricRecommendation_providerId_idx" ON "WorkFabricRecommendation"("providerId");
CREATE INDEX "WorkFabricRecommendation_status_idx" ON "WorkFabricRecommendation"("status");

-- CreateIndex
CREATE INDEX "ProviderWorkProposal_workId_idx" ON "ProviderWorkProposal"("workId");
CREATE INDEX "ProviderWorkProposal_providerId_idx" ON "ProviderWorkProposal"("providerId");
CREATE INDEX "ProviderWorkProposal_type_idx" ON "ProviderWorkProposal"("type");
CREATE INDEX "ProviderWorkProposal_status_idx" ON "ProviderWorkProposal"("status");

-- AddForeignKey
ALTER TABLE "Fabric" ADD CONSTRAINT "Fabric_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkFabricRecommendation" ADD CONSTRAINT "WorkFabricRecommendation_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkFabricRecommendation" ADD CONSTRAINT "WorkFabricRecommendation_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkFabricRecommendation" ADD CONSTRAINT "WorkFabricRecommendation_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderWorkProposal" ADD CONSTRAINT "ProviderWorkProposal_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderWorkProposal" ADD CONSTRAINT "ProviderWorkProposal_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
