-- CreateTable
CREATE TABLE "EditorialPick" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorialPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EditorialPick_workId_type_key" ON "EditorialPick"("workId", "type");

-- CreateIndex
CREATE INDEX "EditorialPick_workId_idx" ON "EditorialPick"("workId");

-- CreateIndex
CREATE INDEX "EditorialPick_type_idx" ON "EditorialPick"("type");

-- AddForeignKey
ALTER TABLE "EditorialPick" ADD CONSTRAINT "EditorialPick_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
