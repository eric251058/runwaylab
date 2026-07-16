ALTER TYPE "RecommendationStatus" ADD VALUE IF NOT EXISTS 'INTERESTED';

ALTER TYPE "RecommendationStatus" ADD VALUE IF NOT EXISTS 'NOT_SUITABLE';

ALTER TYPE "RecommendationStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';

ALTER TABLE "WorkFabricRecommendation"
  ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "sampleAvailability" TEXT,
  ADD COLUMN IF NOT EXISTS "moqText" TEXT,
  ADD COLUMN IF NOT EXISTS "responseTime" TEXT;

DO $$
BEGIN
  ALTER TABLE "WorkFabricRecommendation"
    ADD CONSTRAINT "WorkFabricRecommendation_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "WorkFabricRecommendation_createdByUserId_idx"
  ON "WorkFabricRecommendation"("createdByUserId");
