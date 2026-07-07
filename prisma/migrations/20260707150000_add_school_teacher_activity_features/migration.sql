-- AlterEnum
ALTER TYPE "ChallengeStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';

-- CreateEnum
CREATE TYPE "ExhibitionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Work" ADD COLUMN "schoolId" TEXT;
ALTER TABLE "Work" ADD COLUMN "teacherId" TEXT;

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN "schoolId" TEXT;
ALTER TABLE "Challenge" ADD COLUMN "teacherId" TEXT;
ALTER TABLE "Challenge" ADD COLUMN "slug" TEXT;
ALTER TABLE "Challenge" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "city" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "description" TEXT,
    "website" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "schoolId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "title" TEXT,
    "department" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "contact" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherRecommendedWork" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT,
    "workId" TEXT NOT NULL,
    "note" TEXT,
    "tag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherRecommendedWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exhibition" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "teacherId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "type" TEXT NOT NULL,
    "coverUrl" TEXT,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ExhibitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exhibition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExhibitionWork" (
    "id" TEXT NOT NULL,
    "exhibitionId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExhibitionWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeWork" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeWork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");
CREATE INDEX "School_isFeatured_idx" ON "School"("isFeatured");
CREATE INDEX "School_status_idx" ON "School"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_slug_key" ON "Teacher"("slug");
CREATE INDEX "Teacher_schoolId_idx" ON "Teacher"("schoolId");
CREATE INDEX "Teacher_isFeatured_idx" ON "Teacher"("isFeatured");
CREATE INDEX "Teacher_status_idx" ON "Teacher"("status");

-- CreateIndex
CREATE INDEX "TeacherRecommendedWork_teacherId_idx" ON "TeacherRecommendedWork"("teacherId");
CREATE INDEX "TeacherRecommendedWork_workId_idx" ON "TeacherRecommendedWork"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "Exhibition_slug_key" ON "Exhibition"("slug");
CREATE INDEX "Exhibition_schoolId_idx" ON "Exhibition"("schoolId");
CREATE INDEX "Exhibition_teacherId_idx" ON "Exhibition"("teacherId");
CREATE INDEX "Exhibition_status_idx" ON "Exhibition"("status");
CREATE INDEX "Exhibition_isFeatured_idx" ON "Exhibition"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "ExhibitionWork_exhibitionId_workId_key" ON "ExhibitionWork"("exhibitionId", "workId");
CREATE INDEX "ExhibitionWork_exhibitionId_idx" ON "ExhibitionWork"("exhibitionId");
CREATE INDEX "ExhibitionWork_workId_idx" ON "ExhibitionWork"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_slug_key" ON "Challenge"("slug");
CREATE INDEX "Challenge_schoolId_idx" ON "Challenge"("schoolId");
CREATE INDEX "Challenge_teacherId_idx" ON "Challenge"("teacherId");
CREATE INDEX "Challenge_isFeatured_idx" ON "Challenge"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeWork_challengeId_workId_key" ON "ChallengeWork"("challengeId", "workId");
CREATE INDEX "ChallengeWork_challengeId_idx" ON "ChallengeWork"("challengeId");
CREATE INDEX "ChallengeWork_workId_idx" ON "ChallengeWork"("workId");

-- CreateIndex
CREATE INDEX "Work_schoolId_idx" ON "Work"("schoolId");
CREATE INDEX "Work_teacherId_idx" ON "Work"("teacherId");

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Work" ADD CONSTRAINT "Work_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherRecommendedWork" ADD CONSTRAINT "TeacherRecommendedWork_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeacherRecommendedWork" ADD CONSTRAINT "TeacherRecommendedWork_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exhibition" ADD CONSTRAINT "Exhibition_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Exhibition" ADD CONSTRAINT "Exhibition_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExhibitionWork" ADD CONSTRAINT "ExhibitionWork_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExhibitionWork" ADD CONSTRAINT "ExhibitionWork_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChallengeWork" ADD CONSTRAINT "ChallengeWork_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeWork" ADD CONSTRAINT "ChallengeWork_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
