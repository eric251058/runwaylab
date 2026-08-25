-- Link a shortlisted provider response to one private collaboration project.
ALTER TABLE "ProviderOpportunityInterest"
ADD COLUMN "collaborationProjectId" TEXT;

CREATE UNIQUE INDEX "ProviderOpportunityInterest_collaborationProjectId_key"
ON "ProviderOpportunityInterest"("collaborationProjectId");

ALTER TABLE "ProviderOpportunityInterest"
ADD CONSTRAINT "ProviderOpportunityInterest_collaborationProjectId_fkey"
FOREIGN KEY ("collaborationProjectId") REFERENCES "CollaborationProject"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Private messages are intentionally scoped to a collaboration project.
CREATE TABLE "ProjectNegotiationMessage" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProjectNegotiationMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectNegotiationMessage_projectId_createdAt_idx"
ON "ProjectNegotiationMessage"("projectId", "createdAt");
CREATE INDEX "ProjectNegotiationMessage_senderId_idx"
ON "ProjectNegotiationMessage"("senderId");

ALTER TABLE "ProjectNegotiationMessage" ADD CONSTRAINT "ProjectNegotiationMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CollaborationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
