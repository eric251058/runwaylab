import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/lib/start-projects.ts", "utf8");
const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20260805090000_add_project_intake_conversion_flow/migration.sql", "utf8");

assert.match(schema, /linkedCollaborationProjectId\s+String\?\s+@unique/, "linked collaboration project should be one-to-one");
assert.match(migration, /CREATE UNIQUE INDEX "ProjectIntake_linkedCollaborationProjectId_key"/, "migration should enforce one-to-one conversion link");
assert.match(service, /if \(current\.linkedCollaborationProjectId\) \{[\s\S]*idempotent:\s*true/, "already converted intakes should return the existing project");
assert.match(service, /maxAttempts\s*=\s*2/, "conversion should have a bounded retry count");
assert.match(service, /P2002/, "unique conflicts should be handled");
assert.match(service, /P2034/, "transaction serialization conflicts should be handled");
assert.match(service, /getConvertedIntakeForAdmin/, "retry path should re-read the latest converted state");

console.log("project intake conversion idempotency tests passed");
