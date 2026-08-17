-- Bind each V2.3 author decision to exactly one preorder campaign.
-- Existing V2.1/V2.2 authorizations remain unchanged and must be explicitly renewed for V2.3.
ALTER TABLE "ProjectDesignAuthorization"
ADD COLUMN "preorderCampaignId" TEXT;

CREATE INDEX "ProjectDesignAuthorization_preorderCampaignId_idx"
ON "ProjectDesignAuthorization"("preorderCampaignId");

ALTER TABLE "ProjectDesignAuthorization"
ADD CONSTRAINT "ProjectDesignAuthorization_preorderCampaignId_fkey"
FOREIGN KEY ("preorderCampaignId") REFERENCES "PresaleCampaign"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
