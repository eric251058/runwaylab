-- CreateEnum
CREATE TYPE "WorkVoteType" AS ENUM ('WANT_BUY', 'SUITABLE_SAMPLE', 'SUITABLE_PRODUCTION', 'SUITABLE_RUNWAY', 'CONFUSING');

-- CreateEnum
CREATE TYPE "ContributionPersona" AS ENUM ('CONSUMER', 'STUDENT', 'TEACHER', 'PROVIDER', 'BUYER', 'OTHER');

-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('DESIGN_ADVICE', 'FABRIC_ADVICE', 'SAMPLE_ADVICE', 'PRODUCTION_ADVICE', 'MARKET_ADVICE', 'BUYER_INTEREST', 'OTHER');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('NEW', 'VALUABLE', 'REVIEWED', 'PROCESSED', 'IGNORED');

-- CreateTable
CREATE TABLE "WorkVote" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "type" "WorkVoteType" NOT NULL,
    "voterName" TEXT,
    "voterContact" TEXT,
    "voterPersona" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkContribution" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "persona" "ContributionPersona" NOT NULL,
    "type" "ContributionType" NOT NULL,
    "content" TEXT NOT NULL,
    "name" TEXT,
    "contact" TEXT,
    "status" "ContributionStatus" NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkVote_workId_idx" ON "WorkVote"("workId");
CREATE INDEX "WorkVote_type_idx" ON "WorkVote"("type");
CREATE INDEX "WorkVote_createdAt_idx" ON "WorkVote"("createdAt");

-- CreateIndex
CREATE INDEX "WorkContribution_workId_idx" ON "WorkContribution"("workId");
CREATE INDEX "WorkContribution_persona_idx" ON "WorkContribution"("persona");
CREATE INDEX "WorkContribution_type_idx" ON "WorkContribution"("type");
CREATE INDEX "WorkContribution_status_idx" ON "WorkContribution"("status");
CREATE INDEX "WorkContribution_createdAt_idx" ON "WorkContribution"("createdAt");

-- AddForeignKey
ALTER TABLE "WorkVote" ADD CONSTRAINT "WorkVote_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkContribution" ADD CONSTRAINT "WorkContribution_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
