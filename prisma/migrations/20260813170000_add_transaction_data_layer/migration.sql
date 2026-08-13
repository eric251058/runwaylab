CREATE TYPE "CommercePaymentAttemptStatus" AS ENUM ('CREATED', 'PROCESSING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED');
CREATE TYPE "CommerceRefundStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "CommerceIdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "CommerceAggregateType" AS ENUM ('CAMPAIGN', 'ORDER', 'PAYMENT', 'REFUND', 'FULFILLMENT');

CREATE TABLE "CommercePaymentAttempt" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAttemptId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CNY',
  "status" "CommercePaymentAttemptStatus" NOT NULL DEFAULT 'CREATED',
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "authorizedAt" TIMESTAMP(3),
  "capturedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercePaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommerceRefund" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "paymentAttemptId" TEXT,
  "provider" TEXT NOT NULL,
  "providerRefundId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CNY',
  "status" "CommerceRefundStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommerceRefund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommerceIdempotencyRecord" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "status" "CommerceIdempotencyStatus" NOT NULL DEFAULT 'PROCESSING',
  "responseCode" INTEGER,
  "responseBody" JSONB,
  "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommerceIdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommerceStateEvent" (
  "id" TEXT NOT NULL,
  "aggregateType" "CommerceAggregateType" NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "fromState" TEXT,
  "toState" TEXT NOT NULL,
  "actorId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceStateEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommercePaymentAttempt_idempotencyKey_key" ON "CommercePaymentAttempt"("idempotencyKey");
CREATE UNIQUE INDEX "CommercePaymentAttempt_provider_providerAttemptId_key" ON "CommercePaymentAttempt"("provider", "providerAttemptId");
CREATE INDEX "CommercePaymentAttempt_orderId_idx" ON "CommercePaymentAttempt"("orderId");
CREATE INDEX "CommercePaymentAttempt_status_idx" ON "CommercePaymentAttempt"("status");
CREATE INDEX "CommercePaymentAttempt_createdAt_idx" ON "CommercePaymentAttempt"("createdAt");
CREATE UNIQUE INDEX "CommerceRefund_idempotencyKey_key" ON "CommerceRefund"("idempotencyKey");
CREATE UNIQUE INDEX "CommerceRefund_provider_providerRefundId_key" ON "CommerceRefund"("provider", "providerRefundId");
CREATE INDEX "CommerceRefund_orderId_idx" ON "CommerceRefund"("orderId");
CREATE INDEX "CommerceRefund_paymentAttemptId_idx" ON "CommerceRefund"("paymentAttemptId");
CREATE INDEX "CommerceRefund_status_idx" ON "CommerceRefund"("status");
CREATE INDEX "CommerceRefund_createdAt_idx" ON "CommerceRefund"("createdAt");
CREATE UNIQUE INDEX "CommerceIdempotencyRecord_scope_key_key" ON "CommerceIdempotencyRecord"("scope", "key");
CREATE INDEX "CommerceIdempotencyRecord_status_idx" ON "CommerceIdempotencyRecord"("status");
CREATE INDEX "CommerceIdempotencyRecord_expiresAt_idx" ON "CommerceIdempotencyRecord"("expiresAt");
CREATE UNIQUE INDEX "CommerceStateEvent_aggregateType_aggregateId_idempotencyKey_key" ON "CommerceStateEvent"("aggregateType", "aggregateId", "idempotencyKey");
CREATE INDEX "CommerceStateEvent_aggregateType_aggregateId_createdAt_idx" ON "CommerceStateEvent"("aggregateType", "aggregateId", "createdAt");
CREATE INDEX "CommerceStateEvent_actorId_idx" ON "CommerceStateEvent"("actorId");
CREATE INDEX "CommerceStateEvent_createdAt_idx" ON "CommerceStateEvent"("createdAt");

ALTER TABLE "CommercePaymentAttempt" ADD CONSTRAINT "CommercePaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProjectOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommerceRefund" ADD CONSTRAINT "CommerceRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProjectOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommerceRefund" ADD CONSTRAINT "CommerceRefund_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "CommercePaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
