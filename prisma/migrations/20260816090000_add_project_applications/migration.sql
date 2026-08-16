-- CreateEnum
CREATE TYPE "ProjectApplicationRole" AS ENUM ('PROJECT_LEAD', 'FABRIC_PARTNER', 'SAMPLE_PARTNER', 'PRODUCTION_PARTNER', 'BUYER', 'MARKETING_PARTNER', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "ProjectApplication" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "role" "ProjectApplicationRole" NOT NULL,
    "message" TEXT NOT NULL,
    "experience" TEXT,
    "status" "ProjectApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectApplication_projectId_applicantId_role_key" ON "ProjectApplication"("projectId", "applicantId", "role");
CREATE INDEX "ProjectApplication_projectId_status_idx" ON "ProjectApplication"("projectId", "status");
CREATE INDEX "ProjectApplication_applicantId_status_idx" ON "ProjectApplication"("applicantId", "status");
CREATE INDEX "ProjectApplication_reviewedById_idx" ON "ProjectApplication"("reviewedById");

-- AddForeignKey
ALTER TABLE "ProjectApplication" ADD CONSTRAINT "ProjectApplication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CollaborationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectApplication" ADD CONSTRAINT "ProjectApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectApplication" ADD CONSTRAINT "ProjectApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
