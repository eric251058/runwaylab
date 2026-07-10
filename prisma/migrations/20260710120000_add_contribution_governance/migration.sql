-- CreateEnum
CREATE TYPE "WorkVoteStatus" AS ENUM ('ACTIVE', 'HIDDEN');

-- Add nullable governance fields first so existing rows can be backfilled safely.
ALTER TABLE "WorkVote"
ADD COLUMN "actorKey" TEXT,
ADD COLUMN "status" "WorkVoteStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "adminNote" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3);

ALTER TABLE "WorkContribution"
ADD COLUMN "actorKey" TEXT;

-- Backfill existing V1.6 data without deleting or merging anything.
UPDATE "WorkVote"
SET "actorKey" = 'legacy-vote:' || "id",
    "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "actorKey" IS NULL;

UPDATE "WorkContribution"
SET "actorKey" = 'legacy-contribution:' || "id"
WHERE "actorKey" IS NULL;

-- Enforce required actor keys after backfill.
ALTER TABLE "WorkVote"
ALTER COLUMN "actorKey" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "WorkContribution"
ALTER COLUMN "actorKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WorkVote_workId_actorKey_key" ON "WorkVote"("workId", "actorKey");
CREATE INDEX "WorkVote_actorKey_createdAt_idx" ON "WorkVote"("actorKey", "createdAt");
CREATE INDEX "WorkVote_workId_status_type_idx" ON "WorkVote"("workId", "status", "type");

CREATE INDEX "WorkContribution_actorKey_createdAt_idx" ON "WorkContribution"("actorKey", "createdAt");
CREATE INDEX "WorkContribution_workId_status_createdAt_idx" ON "WorkContribution"("workId", "status", "createdAt");
