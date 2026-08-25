-- Tie user-authored provider reviews to a completed project order.
ALTER TABLE "Review"
ADD COLUMN "orderId" TEXT;

CREATE UNIQUE INDEX "Review_orderId_reviewerId_key"
ON "Review"("orderId", "reviewerId");

ALTER TABLE "Review"
ADD CONSTRAINT "Review_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "ProjectOrder"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
