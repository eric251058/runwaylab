import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const migrationPath = "prisma/migrations/20260805090000_add_project_intake_conversion_flow/migration.sql";
const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(migrationPath, "utf8");

assert.equal(existsSync(migrationPath), true, "conversion migration should exist");
assert.match(migration, /ALTER TYPE "ProjectIntakeEventType" ADD VALUE IF NOT EXISTS 'CONVERTED'/, "migration should add CONVERTED event type");
assert.match(migration, /ADD COLUMN "convertedAt" TIMESTAMP\(3\)/, "migration should add convertedAt");
assert.match(migration, /ADD COLUMN "convertedById" TEXT/, "migration should add convertedById");
assert.match(migration, /ALTER TABLE "CollaborationProject"[\s\S]*ALTER COLUMN "workId" DROP NOT NULL/, "migration should make workId optional");
assert.match(migration, /CREATE UNIQUE INDEX "ProjectIntake_linkedCollaborationProjectId_key"/, "migration should add one-to-one linked project index");
assert.match(migration, /ON DELETE SET NULL ON UPDATE CASCADE/, "convertedBy relation should preserve intakes if admin user is removed");
assert.doesNotMatch(migration, /UPDATE "ProjectIntake"|DELETE FROM "ProjectIntake"|DROP TABLE "ProjectIntake"|DROP TABLE "CollaborationProject"/, "migration must not rewrite or delete existing data");
assert.match(schema, /convertedBy\s+User\?\s+@relation\("ProjectIntakeConvertedBy"/, "schema should expose convertedBy relation");

console.log("project intake conversion migration tests passed");
