-- Add controlled conversion from accepted ProjectIntake to a private CollaborationProject.
-- Existing intakes stay untouched; accepted intakes are not auto-converted.

ALTER TYPE "ProjectIntakeEventType" ADD VALUE IF NOT EXISTS 'CONVERTED';

ALTER TABLE "ProjectIntake"
    ADD COLUMN "convertedAt" TIMESTAMP(3),
    ADD COLUMN "convertedById" TEXT;

ALTER TABLE "CollaborationProject"
    ALTER COLUMN "workId" DROP NOT NULL;

DROP INDEX IF EXISTS "ProjectIntake_linkedCollaborationProjectId_idx";

CREATE UNIQUE INDEX "ProjectIntake_linkedCollaborationProjectId_key"
    ON "ProjectIntake"("linkedCollaborationProjectId");

CREATE INDEX "ProjectIntake_status_convertedAt_idx"
    ON "ProjectIntake"("status", "convertedAt");

CREATE INDEX "ProjectIntake_convertedById_idx"
    ON "ProjectIntake"("convertedById");

ALTER TABLE "ProjectIntake"
    ADD CONSTRAINT "ProjectIntake_convertedById_fkey"
    FOREIGN KEY ("convertedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
