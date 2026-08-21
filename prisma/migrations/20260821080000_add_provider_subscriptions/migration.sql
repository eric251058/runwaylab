CREATE TYPE "ProviderSubscriptionPlan" AS ENUM ('FOUNDING_TRIAL', 'GROWTH_MONTHLY', 'GROWTH_QUARTERLY', 'GROWTH_YEARLY');
CREATE TYPE "ProviderSubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REJECTED', 'CANCELLED');

CREATE TABLE "ProviderSubscription" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "plan" "ProviderSubscriptionPlan" NOT NULL,
  "status" "ProviderSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "priceCny" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderSubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProviderSubscription_providerId_status_idx" ON "ProviderSubscription"("providerId", "status");
CREATE INDEX "ProviderSubscription_requestedById_idx" ON "ProviderSubscription"("requestedById");
CREATE INDEX "ProviderSubscription_reviewedById_idx" ON "ProviderSubscription"("reviewedById");
CREATE INDEX "ProviderSubscription_endsAt_idx" ON "ProviderSubscription"("endsAt");

ALTER TABLE "ProviderSubscription" ADD CONSTRAINT "ProviderSubscription_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderSubscription" ADD CONSTRAINT "ProviderSubscription_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderSubscription" ADD CONSTRAINT "ProviderSubscription_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
