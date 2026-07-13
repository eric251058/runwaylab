-- CreateEnum
CREATE TYPE "AiDiagnosisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AiDiagnosisReviewStatus" AS ENUM ('UNREVIEWED', 'APPROVED', 'NEEDS_REVISION', 'REJECTED');

-- CreateTable
CREATE TABLE "WorkAiDiagnosis" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "status" "AiDiagnosisStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "designSummary" TEXT,
    "designHighlights" TEXT,
    "targetAudience" TEXT,
    "suitableScenes" TEXT,
    "suggestedCategories" TEXT,
    "suggestedMaterials" TEXT,
    "suggestedTechniques" TEXT,
    "productionRisks" TEXT,
    "missingInformation" TEXT,
    "nextStepSuggestions" TEXT,
    "professionalAssessment" TEXT,
    "productionAssessment" TEXT,
    "marketAssessment" TEXT,
    "confidence" INTEGER,
    "modelProvider" TEXT,
    "modelName" TEXT,
    "promptVersion" TEXT,
    "rawResponse" JSONB,
    "requestedById" TEXT,
    "reviewedById" TEXT,
    "reviewStatus" "AiDiagnosisReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "adminNote" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkAiDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkAiDiagnosis_workId_idx" ON "WorkAiDiagnosis"("workId");

-- CreateIndex
CREATE INDEX "WorkAiDiagnosis_status_idx" ON "WorkAiDiagnosis"("status");

-- CreateIndex
CREATE INDEX "WorkAiDiagnosis_reviewStatus_idx" ON "WorkAiDiagnosis"("reviewStatus");

-- CreateIndex
CREATE INDEX "WorkAiDiagnosis_createdAt_idx" ON "WorkAiDiagnosis"("createdAt");

-- AddForeignKey
ALTER TABLE "WorkAiDiagnosis" ADD CONSTRAINT "WorkAiDiagnosis_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkAiDiagnosis" ADD CONSTRAINT "WorkAiDiagnosis_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkAiDiagnosis" ADD CONSTRAINT "WorkAiDiagnosis_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
