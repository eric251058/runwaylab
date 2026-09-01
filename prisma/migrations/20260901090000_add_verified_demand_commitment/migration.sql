CREATE TYPE "ProjectCommitmentStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'EVIDENCE_PENDING', 'VERIFIED', 'REJECTED');

ALTER TABLE "ProjectStage"
  ADD COLUMN "commitmentStatus" "ProjectCommitmentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "commitmentAmount" INTEGER,
  ADD COLUMN "commitmentReference" TEXT,
  ADD COLUMN "commitmentNote" TEXT,
  ADD COLUMN "commitmentSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "commitmentVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "commitmentVerifiedById" TEXT;

ALTER TABLE "ProjectStageProposal"
  ADD COLUMN "revisionRounds" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "acceptanceCriteria" JSONB;

CREATE INDEX "ProjectStage_commitmentStatus_updatedAt_idx" ON "ProjectStage"("commitmentStatus", "updatedAt");
CREATE INDEX "ProjectStage_commitmentVerifiedById_idx" ON "ProjectStage"("commitmentVerifiedById");

ALTER TABLE "ProjectStage"
  ADD CONSTRAINT "ProjectStage_commitmentVerifiedById_fkey"
  FOREIGN KEY ("commitmentVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectStage"
  ADD CONSTRAINT "ProjectStage_commitmentAmount_nonnegative"
  CHECK ("commitmentAmount" IS NULL OR "commitmentAmount" >= 0);

ALTER TABLE "ProjectStageProposal"
  ADD CONSTRAINT "ProjectStageProposal_revisionRounds_range"
  CHECK ("revisionRounds" BETWEEN 0 AND 10);
