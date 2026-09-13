CREATE TABLE "SupportRequest" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "requesterId" TEXT NOT NULL,
 "clientId" TEXT NOT NULL,
 "category" TEXT NOT NULL CHECK ("category" IN ('FEEDBACK','CORRECTION','DELETION')),
 "message" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','RESOLVED')),
 "reply" TEXT,
 "handledById" TEXT,
 "handledAt" TIMESTAMP(3),
 "version" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SupportRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SupportRequest_requesterId_clientId_key" ON "SupportRequest"("requesterId", "clientId");
CREATE INDEX "SupportRequest_status_createdAt_idx" ON "SupportRequest"("status", "createdAt");
