import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const migrationPath = "prisma/migrations/20260730160000_add_project_intake_start_flow/migration.sql";

assert.equal(existsSync(migrationPath), true, "ProjectIntake migration should exist");

const migration = readFileSync(migrationPath, "utf8");

assert.match(migration, /CREATE TYPE "ProjectIntakeStatus"/, "migration should create ProjectIntakeStatus enum");
assert.match(migration, /CREATE TABLE "ProjectIntake"/, "migration should create ProjectIntake table");
assert.match(migration, /"ownerId" TEXT NOT NULL/, "migration should store ownerId");
assert.match(migration, /"clientDraftId" TEXT NOT NULL/, "migration should store clientDraftId");
assert.match(migration, /ProjectIntake_ownerId_clientDraftId_key/, "migration should create idempotency unique index");
assert.match(migration, /REFERENCES "User"\("id"\) ON DELETE CASCADE/, "migration should tie owner to User");
assert.match(migration, /REFERENCES "Work"\("id"\) ON DELETE SET NULL/, "migration should allow later Work binding without cascade deleting intake");
assert.match(migration, /REFERENCES "CollaborationProject"\("id"\) ON DELETE SET NULL/, "migration should allow later CollaborationProject binding");
assert.match(migration, /REFERENCES "IncubationProject"\("id"\) ON DELETE SET NULL/, "migration should allow later IncubationProject binding");
assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|ALTER TYPE .* RENAME|DELETE FROM|UPDATE "Work"/, "migration must not rewrite or delete existing production data");

console.log("start project migration tests passed");
