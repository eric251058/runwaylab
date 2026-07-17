-- Extend inquiry service types used by designer-to-provider inquiries.
ALTER TYPE "ProviderInquiryType" ADD VALUE IF NOT EXISTS 'ACCESSORY';
ALTER TYPE "ProviderInquiryType" ADD VALUE IF NOT EXISTS 'PROCESS';
ALTER TYPE "ProviderInquiryType" ADD VALUE IF NOT EXISTS 'OTHER';

-- Lightweight threaded replies for CooperationRequest. This keeps the existing
-- inquiry model as the source of truth and adds append-only reply records.
CREATE TABLE "CooperationRequestReply" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CooperationRequestReply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CooperationRequestReply_inquiryId_createdAt_idx" ON "CooperationRequestReply"("inquiryId", "createdAt");
CREATE INDEX "CooperationRequestReply_senderId_idx" ON "CooperationRequestReply"("senderId");
CREATE INDEX "CooperationRequestReply_isRead_idx" ON "CooperationRequestReply"("isRead");

ALTER TABLE "CooperationRequestReply"
ADD CONSTRAINT "CooperationRequestReply_inquiryId_fkey"
FOREIGN KEY ("inquiryId") REFERENCES "CooperationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CooperationRequestReply"
ADD CONSTRAINT "CooperationRequestReply_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
