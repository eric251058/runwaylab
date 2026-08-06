import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const migrationPath = "prisma/migrations/20260805193000_add_private_project_kickoff_flow/migration.sql";
const schema = readFileSync("prisma/schema.prisma", "utf8");

assert.equal(existsSync(migrationPath), true, "private project kickoff migration should exist");
const migration = readFileSync(migrationPath, "utf8");

assert.match(schema, /enum CollaborationProjectActionType/, "schema should include action type enum");
assert.match(schema, /enum CollaborationProjectActionResponsibility/, "schema should include action responsibility enum");
assert.match(schema, /enum CollaborationProjectActionStatus/, "schema should include action status enum");
assert.match(schema, /enum CollaborationProjectEventType/, "schema should include event type enum");
assert.match(schema, /model CollaborationProjectAction/, "schema should include CollaborationProjectAction");
assert.match(schema, /model CollaborationProjectEvent/, "schema should include CollaborationProjectEvent");
assert.match(migration, /CREATE TYPE "CollaborationProjectActionType"/, "migration should create action type enum");
assert.match(migration, /CREATE TABLE "CollaborationProjectAction"/, "migration should create action table");
assert.match(migration, /CREATE TABLE "CollaborationProjectEvent"/, "migration should create event table");
assert.match(migration, /CollaborationProjectAction_one_open_action_key/, "migration should create one-open-action protection");
assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE|UPDATE "CollaborationProject"/, "migration must not rewrite or delete existing data");

console.log("private project action migration tests passed");
