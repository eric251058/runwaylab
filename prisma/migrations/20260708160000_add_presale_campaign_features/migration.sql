-- CreateEnum
CREATE TYPE "PresaleCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PresaleCampaignIntentStatus" AS ENUM ('SUBMITTED', 'CONTACTED', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PresaleCampaign" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "targetCount" INTEGER NOT NULL DEFAULT 50,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedPrice" TEXT,
    "priceNote" TEXT,
    "sizeOptions" TEXT[],
    "colorOptions" TEXT[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "PresaleCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresaleCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresaleCampaignIntent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "wechat" TEXT,
    "size" TEXT,
    "color" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "source" TEXT,
    "status" "PresaleCampaignIntentStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresaleCampaignIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PresaleCampaign_slug_key" ON "PresaleCampaign"("slug");
CREATE INDEX "PresaleCampaign_workId_idx" ON "PresaleCampaign"("workId");
CREATE INDEX "PresaleCampaign_createdById_idx" ON "PresaleCampaign"("createdById");
CREATE INDEX "PresaleCampaign_status_idx" ON "PresaleCampaign"("status");
CREATE INDEX "PresaleCampaign_isFeatured_idx" ON "PresaleCampaign"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "PresaleCampaignIntent_campaignId_userId_key" ON "PresaleCampaignIntent"("campaignId", "userId");
CREATE INDEX "PresaleCampaignIntent_campaignId_idx" ON "PresaleCampaignIntent"("campaignId");
CREATE INDEX "PresaleCampaignIntent_workId_idx" ON "PresaleCampaignIntent"("workId");
CREATE INDEX "PresaleCampaignIntent_userId_idx" ON "PresaleCampaignIntent"("userId");
CREATE INDEX "PresaleCampaignIntent_status_idx" ON "PresaleCampaignIntent"("status");

-- AddForeignKey
ALTER TABLE "PresaleCampaign" ADD CONSTRAINT "PresaleCampaign_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PresaleCampaign" ADD CONSTRAINT "PresaleCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresaleCampaignIntent" ADD CONSTRAINT "PresaleCampaignIntent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PresaleCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PresaleCampaignIntent" ADD CONSTRAINT "PresaleCampaignIntent_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PresaleCampaignIntent" ADD CONSTRAINT "PresaleCampaignIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
