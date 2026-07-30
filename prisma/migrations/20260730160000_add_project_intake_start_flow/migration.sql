-- CreateEnum
CREATE TYPE "ProjectIntakeStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW');

-- CreateTable
CREATE TABLE "ProjectIntake" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "clientDraftId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "categoryOther" TEXT,
    "primaryNeed" TEXT NOT NULL,
    "ideaText" TEXT,
    "status" "ProjectIntakeStatus" NOT NULL DEFAULT 'DRAFT',
    "completion" INTEGER NOT NULL DEFAULT 75,
    "linkedWorkId" TEXT,
    "linkedCollaborationProjectId" TEXT,
    "linkedIncubationProjectId" TEXT,
    "submittedForReviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectIntake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectIntake_ownerId_clientDraftId_key" ON "ProjectIntake"("ownerId", "clientDraftId");

-- CreateIndex
CREATE INDEX "ProjectIntake_ownerId_updatedAt_idx" ON "ProjectIntake"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "ProjectIntake_status_idx" ON "ProjectIntake"("status");

-- CreateIndex
CREATE INDEX "ProjectIntake_linkedWorkId_idx" ON "ProjectIntake"("linkedWorkId");

-- CreateIndex
CREATE INDEX "ProjectIntake_linkedCollaborationProjectId_idx" ON "ProjectIntake"("linkedCollaborationProjectId");

-- CreateIndex
CREATE INDEX "ProjectIntake_linkedIncubationProjectId_idx" ON "ProjectIntake"("linkedIncubationProjectId");

-- AddForeignKey
ALTER TABLE "ProjectIntake" ADD CONSTRAINT "ProjectIntake_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectIntake" ADD CONSTRAINT "ProjectIntake_linkedWorkId_fkey" FOREIGN KEY ("linkedWorkId") REFERENCES "Work"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectIntake" ADD CONSTRAINT "ProjectIntake_linkedCollaborationProjectId_fkey" FOREIGN KEY ("linkedCollaborationProjectId") REFERENCES "CollaborationProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectIntake" ADD CONSTRAINT "ProjectIntake_linkedIncubationProjectId_fkey" FOREIGN KEY ("linkedIncubationProjectId") REFERENCES "IncubationProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
