-- CreateEnum
CREATE TYPE "WorkIncubationStatus" AS ENUM ('DISPLAYING', 'CANDIDATE', 'FABRIC_MATCHING', 'SAMPLE_MATCHING', 'PRODUCTION_MATCHING', 'PRESALE_TESTING', 'COLLABORATION_REACHED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'INTERESTED', 'ACCEPTED', 'REJECTED', 'INVALID');

-- CreateTable
CREATE TABLE "WorkIncubation" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "status" "WorkIncubationStatus" NOT NULL DEFAULT 'DISPLAYING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkIncubation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FabricProposal" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "proposerName" TEXT NOT NULL,
    "companyName" TEXT,
    "contact" TEXT NOT NULL,
    "fabricName" TEXT NOT NULL,
    "composition" TEXT,
    "weight" TEXT,
    "width" TEXT,
    "priceRange" TEXT,
    "reason" TEXT,
    "imageUrl" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FabricProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleProposal" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "proposerName" TEXT NOT NULL,
    "studioName" TEXT,
    "contact" TEXT NOT NULL,
    "serviceType" TEXT,
    "category" TEXT,
    "leadTime" TEXT,
    "priceRange" TEXT,
    "message" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SampleProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactoryProposal" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "proposerName" TEXT NOT NULL,
    "factoryName" TEXT,
    "contact" TEXT NOT NULL,
    "category" TEXT,
    "moq" TEXT,
    "leadTime" TEXT,
    "unitPriceRange" TEXT,
    "message" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FactoryProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerIntent" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "companyName" TEXT,
    "contact" TEXT NOT NULL,
    "channelType" TEXT,
    "quantity" TEXT,
    "targetPrice" TEXT,
    "cooperationType" TEXT,
    "message" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresaleIntent" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "quantity" TEXT,
    "acceptablePrice" TEXT,
    "message" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresaleIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkIncubation_workId_key" ON "WorkIncubation"("workId");

-- CreateIndex
CREATE INDEX "WorkIncubation_status_idx" ON "WorkIncubation"("status");

-- CreateIndex
CREATE INDEX "FabricProposal_workId_idx" ON "FabricProposal"("workId");

-- CreateIndex
CREATE INDEX "FabricProposal_status_idx" ON "FabricProposal"("status");

-- CreateIndex
CREATE INDEX "SampleProposal_workId_idx" ON "SampleProposal"("workId");

-- CreateIndex
CREATE INDEX "SampleProposal_status_idx" ON "SampleProposal"("status");

-- CreateIndex
CREATE INDEX "FactoryProposal_workId_idx" ON "FactoryProposal"("workId");

-- CreateIndex
CREATE INDEX "FactoryProposal_status_idx" ON "FactoryProposal"("status");

-- CreateIndex
CREATE INDEX "BuyerIntent_workId_idx" ON "BuyerIntent"("workId");

-- CreateIndex
CREATE INDEX "BuyerIntent_status_idx" ON "BuyerIntent"("status");

-- CreateIndex
CREATE INDEX "PresaleIntent_workId_idx" ON "PresaleIntent"("workId");

-- CreateIndex
CREATE INDEX "PresaleIntent_status_idx" ON "PresaleIntent"("status");

-- AddForeignKey
ALTER TABLE "WorkIncubation" ADD CONSTRAINT "WorkIncubation_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricProposal" ADD CONSTRAINT "FabricProposal_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleProposal" ADD CONSTRAINT "SampleProposal_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactoryProposal" ADD CONSTRAINT "FactoryProposal_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerIntent" ADD CONSTRAINT "BuyerIntent_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresaleIntent" ADD CONSTRAINT "PresaleIntent_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
