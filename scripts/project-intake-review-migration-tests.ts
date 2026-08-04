import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const migrationPath = "prisma/migrations/20260731090000_add_project_intake_review_flow/migration.sql";
const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(migrationPath, "utf8");

assert.equal(existsSync(migrationPath), true, "review flow migration should exist");
assert.match(migration, /ALTER TYPE "ProjectIntakeStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED'/, "migration should add SUBMITTED");
assert.match(migration, /ADD COLUMN "projectTitle" TEXT/, "migration should add projectTitle as nullable");
assert.match(migration, /ADD COLUMN "targetAudience" TEXT/, "migration should add targetAudience as nullable");
assert.match(migration, /ADD COLUMN "reviewedById" TEXT/, "migration should add reviewedById as nullable");
assert.match(migration, /CREATE TYPE "ProjectIntakeEventType"/, "migration should create event enum");
assert.match(migration, /CREATE TABLE "ProjectIntakeEvent"/, "migration should create event table");
assert.match(migration, /ON DELETE CASCADE/, "event rows should cascade with intake deletion");
assert.match(migration, /ON DELETE SET NULL/, "reviewer and actor relations should preserve events if user is removed");
assert.doesNotMatch(migration, /UPDATE "ProjectIntake"|DELETE FROM "ProjectIntake"|DROP TABLE "ProjectIntake"/, "migration must not rewrite or delete existing intakes");
assert.match(schema, /@@index\(\[status, submittedForReviewAt\]\)/, "schema should index admin waiting review list");

console.log("project intake review migration tests passed");
