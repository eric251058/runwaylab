import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("prisma/migrations/20260805193000_add_private_project_kickoff_flow/migration.sql", "utf8");
const service = readFileSync("src/lib/private-project-actions.ts", "utf8");

assert.match(migration, /CREATE UNIQUE INDEX "CollaborationProjectAction_one_open_action_key"/, "migration should enforce one open current action per project");
assert.match(migration, /WHERE "status" IN \('ACTIVE', 'WAITING_PLATFORM_CONFIRMATION'\)/, "partial unique index should cover active and waiting-confirmation actions");
assert.match(service, /TransactionIsolationLevel\.Serializable/g, "action transitions should run in serializable transactions");
assert.match(service, /updateMany\(\{[\s\S]*updatedAt:\s*parsed\.data\.expectedUpdatedAt/, "state transitions should use updatedAt optimistic locking when provided");
assert.match(service, /P2002/, "service should catch unique index conflicts");
assert.match(service, /P2034/, "service should catch transaction conflicts");
assert.match(service, /conflictMessage\(\)/, "concurrency failures should use a safe user-facing conflict message");

console.log("private project action concurrency tests passed");
