ALTER TABLE "CooperationRequest" ADD COLUMN "clientId" TEXT, ADD COLUMN "requestHash" TEXT;
ALTER TABLE "CooperationRequestReply" ADD COLUMN "clientId" TEXT, ADD COLUMN "requestHash" TEXT;
CREATE UNIQUE INDEX "CooperationRequest_userId_clientId_key" ON "CooperationRequest"("userId", "clientId");
CREATE UNIQUE INDEX "CooperationRequestReply_senderId_clientId_key" ON "CooperationRequestReply"("senderId", "clientId");
