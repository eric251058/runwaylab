-- Extend existing ReviewStatus enum for public reviews.
ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'HIDDEN';

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('DESIGNER', 'TEACHER', 'SCHOOL', 'FABRIC_SUPPLIER', 'SAMPLE_STUDIO', 'FACTORY', 'BUYER', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CollaborationProjectStatus" AS ENUM ('DRAFT', 'MATCHING', 'SAMPLING', 'PRESALE_VALIDATING', 'PRODUCTION_DISCUSSION', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CollaborationProjectPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ProjectOrderStatus" AS ENUM ('INTENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewTargetType" AS ENUM ('USER', 'PROVIDER', 'WORK', 'PROJECT');

-- CreateEnum
CREATE TYPE "CaseStudyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "persona" "UserPersona" NOT NULL,
    "type" "VerificationType" NOT NULL,
    "realName" TEXT,
    "organizationName" TEXT,
    "roleTitle" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "wechat" TEXT,
    "city" TEXT,
    "description" TEXT,
    "proofUrl" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollaborationProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "workId" TEXT NOT NULL,
    "designerId" TEXT,
    "schoolId" TEXT,
    "teacherId" TEXT,
    "providerId" TEXT,
    "fabricId" TEXT,
    "presaleCampaignId" TEXT,
    "description" TEXT,
    "status" "CollaborationProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "CollaborationProjectPriority" NOT NULL DEFAULT 'NORMAL',
    "targetQuantity" TEXT,
    "estimatedBudget" TEXT,
    "targetLaunchDate" TIMESTAMP(3),
    "internalNote" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollaborationProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectOrder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workId" TEXT,
    "buyerId" TEXT,
    "providerId" TEXT,
    "title" TEXT NOT NULL,
    "quantityNote" TEXT,
    "amountNote" TEXT,
    "deliveryNote" TEXT,
    "status" "ProjectOrderStatus" NOT NULL DEFAULT 'INTENT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "targetType" "ReviewTargetType" NOT NULL,
    "targetUserId" TEXT,
    "providerId" TEXT,
    "workId" TEXT,
    "projectId" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "content" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStudy" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coverUrl" TEXT,
    "summary" TEXT,
    "content" TEXT,
    "workId" TEXT,
    "projectId" TEXT,
    "schoolId" TEXT,
    "teacherId" TEXT,
    "providerId" TEXT,
    "designerName" TEXT,
    "resultNote" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" "CaseStudyStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseStudy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationRequest_userId_idx" ON "VerificationRequest"("userId");
CREATE INDEX "VerificationRequest_persona_idx" ON "VerificationRequest"("persona");
CREATE INDEX "VerificationRequest_type_idx" ON "VerificationRequest"("type");
CREATE INDEX "VerificationRequest_status_idx" ON "VerificationRequest"("status");

CREATE UNIQUE INDEX "CollaborationProject_slug_key" ON "CollaborationProject"("slug");
CREATE INDEX "CollaborationProject_workId_idx" ON "CollaborationProject"("workId");
CREATE INDEX "CollaborationProject_designerId_idx" ON "CollaborationProject"("designerId");
CREATE INDEX "CollaborationProject_schoolId_idx" ON "CollaborationProject"("schoolId");
CREATE INDEX "CollaborationProject_teacherId_idx" ON "CollaborationProject"("teacherId");
CREATE INDEX "CollaborationProject_providerId_idx" ON "CollaborationProject"("providerId");
CREATE INDEX "CollaborationProject_fabricId_idx" ON "CollaborationProject"("fabricId");
CREATE INDEX "CollaborationProject_presaleCampaignId_idx" ON "CollaborationProject"("presaleCampaignId");
CREATE INDEX "CollaborationProject_status_idx" ON "CollaborationProject"("status");
CREATE INDEX "CollaborationProject_priority_idx" ON "CollaborationProject"("priority");

CREATE INDEX "ProjectOrder_projectId_idx" ON "ProjectOrder"("projectId");
CREATE INDEX "ProjectOrder_workId_idx" ON "ProjectOrder"("workId");
CREATE INDEX "ProjectOrder_buyerId_idx" ON "ProjectOrder"("buyerId");
CREATE INDEX "ProjectOrder_providerId_idx" ON "ProjectOrder"("providerId");
CREATE INDEX "ProjectOrder_status_idx" ON "ProjectOrder"("status");

CREATE INDEX "Review_reviewerId_idx" ON "Review"("reviewerId");
CREATE INDEX "Review_targetType_idx" ON "Review"("targetType");
CREATE INDEX "Review_targetUserId_idx" ON "Review"("targetUserId");
CREATE INDEX "Review_providerId_idx" ON "Review"("providerId");
CREATE INDEX "Review_workId_idx" ON "Review"("workId");
CREATE INDEX "Review_projectId_idx" ON "Review"("projectId");
CREATE INDEX "Review_status_idx" ON "Review"("status");

CREATE UNIQUE INDEX "CaseStudy_slug_key" ON "CaseStudy"("slug");
CREATE INDEX "CaseStudy_workId_idx" ON "CaseStudy"("workId");
CREATE INDEX "CaseStudy_projectId_idx" ON "CaseStudy"("projectId");
CREATE INDEX "CaseStudy_schoolId_idx" ON "CaseStudy"("schoolId");
CREATE INDEX "CaseStudy_teacherId_idx" ON "CaseStudy"("teacherId");
CREATE INDEX "CaseStudy_providerId_idx" ON "CaseStudy"("providerId");
CREATE INDEX "CaseStudy_status_idx" ON "CaseStudy"("status");
CREATE INDEX "CaseStudy_isFeatured_idx" ON "CaseStudy"("isFeatured");

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CollaborationProject" ADD CONSTRAINT "CollaborationProject_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationProject" ADD CONSTRAINT "CollaborationProject_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollaborationProject" ADD CONSTRAINT "CollaborationProject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollaborationProject" ADD CONSTRAINT "CollaborationProject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollaborationProject" ADD CONSTRAINT "CollaborationProject_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollaborationProject" ADD CONSTRAINT "CollaborationProject_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollaborationProject" ADD CONSTRAINT "CollaborationProject_presaleCampaignId_fkey" FOREIGN KEY ("presaleCampaignId") REFERENCES "PresaleCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollaborationProject" ADD CONSTRAINT "CollaborationProject_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectOrder" ADD CONSTRAINT "ProjectOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CollaborationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectOrder" ADD CONSTRAINT "ProjectOrder_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectOrder" ADD CONSTRAINT "ProjectOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectOrder" ADD CONSTRAINT "ProjectOrder_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CollaborationProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseStudy" ADD CONSTRAINT "CaseStudy_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CaseStudy" ADD CONSTRAINT "CaseStudy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CollaborationProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CaseStudy" ADD CONSTRAINT "CaseStudy_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CaseStudy" ADD CONSTRAINT "CaseStudy_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CaseStudy" ADD CONSTRAINT "CaseStudy_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
