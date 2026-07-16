-- Add optional normalized account phone numbers.
-- PostgreSQL unique indexes allow multiple NULL values, so existing users remain untouched.
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
