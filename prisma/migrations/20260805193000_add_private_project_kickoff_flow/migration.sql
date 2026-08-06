-- Add private CollaborationProject kickoff actions and events.
-- This migration does not backfill fake actions or rewrite existing projects.

CREATE TYPE "CollaborationProjectActionType" AS ENUM (
    'DESIGN_CLARIFICATION',
    'FABRIC_BRIEF',
    'SAMPLE_BRIEF',
    'PRODUCTION_FEASIBILITY',
    'PLATFORM_PREPARATION'
);

CREATE TYPE "CollaborationProjectActionResponsibility" AS ENUM (
    'USER',
    'PLATFORM'
);

CREATE TYPE "CollaborationProjectActionStatus" AS ENUM (
    'ACTIVE',
    'WAITING_PLATFORM_CONFIRMATION',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE "CollaborationProjectEventType" AS ENUM (
    'PROJECT_CREATED',
    'ACTION_CREATED',
    'USER_RESULT_SUBMITTED',
    'ACTION_COMPLETED',
    'ACTION_CANCELLED'
);

CREATE TABLE "CollaborationProjectAction" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "CollaborationProjectActionType" NOT NULL,
    "responsibility" "CollaborationProjectActionResponsibility" NOT NULL,
    "status" "CollaborationProjectActionStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userResultNote" TEXT,
    "userResultSubmittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "completionNote" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollaborationProjectAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollaborationProjectEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "actionId" TEXT,
    "actorId" TEXT,
    "eventType" "CollaborationProjectEventType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollaborationProjectEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollaborationProjectAction_projectId_createdAt_idx"
    ON "CollaborationProjectAction"("projectId", "createdAt");

CREATE INDEX "CollaborationProjectAction_projectId_status_idx"
    ON "CollaborationProjectAction"("projectId", "status");

CREATE INDEX "CollaborationProjectAction_status_updatedAt_idx"
    ON "CollaborationProjectAction"("status", "updatedAt");

CREATE INDEX "CollaborationProjectAction_createdById_idx"
    ON "CollaborationProjectAction"("createdById");

CREATE INDEX "CollaborationProjectAction_completedById_idx"
    ON "CollaborationProjectAction"("completedById");

CREATE INDEX "CollaborationProjectAction_cancelledById_idx"
    ON "CollaborationProjectAction"("cancelledById");

CREATE UNIQUE INDEX "CollaborationProjectAction_one_open_action_key"
    ON "CollaborationProjectAction"("projectId")
    WHERE "status" IN ('ACTIVE', 'WAITING_PLATFORM_CONFIRMATION');

CREATE INDEX "CollaborationProjectEvent_projectId_createdAt_idx"
    ON "CollaborationProjectEvent"("projectId", "createdAt");

CREATE INDEX "CollaborationProjectEvent_actionId_createdAt_idx"
    ON "CollaborationProjectEvent"("actionId", "createdAt");

CREATE INDEX "CollaborationProjectEvent_actorId_idx"
    ON "CollaborationProjectEvent"("actorId");

CREATE INDEX "CollaborationProjectEvent_eventType_idx"
    ON "CollaborationProjectEvent"("eventType");

ALTER TABLE "CollaborationProjectAction"
    ADD CONSTRAINT "CollaborationProjectAction_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "CollaborationProject"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaborationProjectAction"
    ADD CONSTRAINT "CollaborationProjectAction_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CollaborationProjectAction"
    ADD CONSTRAINT "CollaborationProjectAction_completedById_fkey"
    FOREIGN KEY ("completedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CollaborationProjectAction"
    ADD CONSTRAINT "CollaborationProjectAction_cancelledById_fkey"
    FOREIGN KEY ("cancelledById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CollaborationProjectEvent"
    ADD CONSTRAINT "CollaborationProjectEvent_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "CollaborationProject"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaborationProjectEvent"
    ADD CONSTRAINT "CollaborationProjectEvent_actionId_fkey"
    FOREIGN KEY ("actionId") REFERENCES "CollaborationProjectAction"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CollaborationProjectEvent"
    ADD CONSTRAINT "CollaborationProjectEvent_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
