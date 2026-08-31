CREATE TYPE "ProjectDemandMode" AS ENUM ('PERSONAL_CUSTOM', 'PUBLIC_COCREATION');
CREATE TYPE "ProjectCommerceStage" AS ENUM ('DESIGN', 'FABRIC', 'SAMPLE', 'PRODUCTION');
CREATE TYPE "ProjectStageStatus" AS ENUM ('BLOCKED', 'OPEN', 'SELECTION_PENDING', 'SELECTED', 'IN_PROGRESS', 'ACCEPTANCE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ProjectStageProposalStatus" AS ENUM ('SUBMITTED', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'WITHDRAWN');

ALTER TABLE "ProjectIntake"
  ADD COLUMN "demandMode" "ProjectDemandMode" NOT NULL DEFAULT 'PERSONAL_CUSTOM',
  ADD COLUMN "budgetMin" INTEGER,
  ADD COLUMN "budgetMax" INTEGER,
  ADD COLUMN "desiredDeliveryAt" TIMESTAMP(3),
  ADD COLUMN "requirements" JSONB,
  ADD COLUMN "referenceImages" JSONB;

ALTER TABLE "CollaborationProject"
  ADD COLUMN "demandMode" "ProjectDemandMode" NOT NULL DEFAULT 'PERSONAL_CUSTOM',
  ADD COLUMN "category" TEXT,
  ADD COLUMN "useScenario" TEXT,
  ADD COLUMN "currentCommerceStage" "ProjectCommerceStage" NOT NULL DEFAULT 'DESIGN';

CREATE TABLE "ProjectStage" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "stage" "ProjectCommerceStage" NOT NULL,
  "status" "ProjectStageStatus" NOT NULL DEFAULT 'BLOCKED',
  "title" TEXT NOT NULL,
  "brief" JSONB,
  "opensAt" TIMESTAMP(3),
  "selectedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "acceptanceAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "selectedProposalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectStageProposal" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "stageId" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "providerId" TEXT,
  "summary" TEXT NOT NULL,
  "directionUrl" TEXT,
  "price" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'CNY',
  "leadTimeDays" INTEGER,
  "deliverables" JSONB,
  "commercialNote" TEXT,
  "status" "ProjectStageProposalStatus" NOT NULL DEFAULT 'SUBMITTED',
  "shortlistedAt" TIMESTAMP(3),
  "selectedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "withdrawnAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectStageProposal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectStage_projectId_stage_key" ON "ProjectStage"("projectId", "stage");
CREATE UNIQUE INDEX "ProjectStage_selectedProposalId_key" ON "ProjectStage"("selectedProposalId");
CREATE INDEX "ProjectStage_projectId_status_idx" ON "ProjectStage"("projectId", "status");
CREATE INDEX "ProjectStage_stage_status_idx" ON "ProjectStage"("stage", "status");
CREATE UNIQUE INDEX "ProjectStageProposal_stageId_applicantId_key" ON "ProjectStageProposal"("stageId", "applicantId");
CREATE INDEX "ProjectStageProposal_projectId_status_idx" ON "ProjectStageProposal"("projectId", "status");
CREATE INDEX "ProjectStageProposal_stageId_status_idx" ON "ProjectStageProposal"("stageId", "status");
CREATE INDEX "ProjectStageProposal_applicantId_status_idx" ON "ProjectStageProposal"("applicantId", "status");
CREATE INDEX "ProjectStageProposal_providerId_status_idx" ON "ProjectStageProposal"("providerId", "status");

ALTER TABLE "ProjectStage" ADD CONSTRAINT "ProjectStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CollaborationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectStageProposal" ADD CONSTRAINT "ProjectStageProposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CollaborationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectStageProposal" ADD CONSTRAINT "ProjectStageProposal_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ProjectStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectStageProposal" ADD CONSTRAINT "ProjectStageProposal_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectStageProposal" ADD CONSTRAINT "ProjectStageProposal_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectStage" ADD CONSTRAINT "ProjectStage_selectedProposalId_fkey" FOREIGN KEY ("selectedProposalId") REFERENCES "ProjectStageProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
