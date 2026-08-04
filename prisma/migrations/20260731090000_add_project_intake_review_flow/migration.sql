-- Extend ProjectIntake from a private start draft into a review-ready intake.
-- Existing drafts stay untouched; new review fields are nullable.

ALTER TYPE "ProjectIntakeStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "ProjectIntakeStatus" ADD VALUE IF NOT EXISTS 'NEEDS_INFO';
ALTER TYPE "ProjectIntakeStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "ProjectIntakeStatus" ADD VALUE IF NOT EXISTS 'DECLINED';

CREATE TYPE "ProjectIntakeEventType" AS ENUM (
    'CREATED',
    'DETAILS_UPDATED',
    'SUBMITTED',
    'WITHDRAWN',
    'NEEDS_INFO',
    'RESUBMITTED',
    'ACCEPTED',
    'DECLINED'
);

ALTER TABLE "ProjectIntake"
    ADD COLUMN "projectTitle" TEXT,
    ADD COLUMN "targetAudience" TEXT,
    ADD COLUMN "useScenario" TEXT,
    ADD COLUMN "expectedPriceBand" TEXT,
    ADD COLUMN "launchTiming" TEXT,
    ADD COLUMN "reviewMessage" TEXT,
    ADD COLUMN "reviewNote" TEXT,
    ADD COLUMN "reviewedById" TEXT,
    ADD COLUMN "reviewedAt" TIMESTAMP(3);

ALTER TABLE "ProjectIntake" ALTER COLUMN "completion" SET DEFAULT 0;

CREATE TABLE "ProjectIntakeEvent" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "actorId" TEXT,
    "eventType" "ProjectIntakeEventType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectIntakeEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectIntake_status_submittedForReviewAt_idx" ON "ProjectIntake"("status", "submittedForReviewAt");
CREATE INDEX "ProjectIntake_reviewedById_idx" ON "ProjectIntake"("reviewedById");
CREATE INDEX "ProjectIntakeEvent_intakeId_createdAt_idx" ON "ProjectIntakeEvent"("intakeId", "createdAt");
CREATE INDEX "ProjectIntakeEvent_actorId_idx" ON "ProjectIntakeEvent"("actorId");
CREATE INDEX "ProjectIntakeEvent_eventType_idx" ON "ProjectIntakeEvent"("eventType");

ALTER TABLE "ProjectIntake" ADD CONSTRAINT "ProjectIntake_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectIntakeEvent" ADD CONSTRAINT "ProjectIntakeEvent_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "ProjectIntake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectIntakeEvent" ADD CONSTRAINT "ProjectIntakeEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
