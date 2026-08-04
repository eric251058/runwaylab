import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20260731090000_add_project_intake_review_flow/migration.sql", "utf8");
const service = readFileSync("src/lib/start-projects.ts", "utf8");
const userPage = readFileSync("src/components/start/ProjectIntakeDetailsFlow.tsx", "utf8");

assert.match(schema, /model ProjectIntakeEvent \{/, "ProjectIntakeEvent model should exist");
assert.match(schema, /enum ProjectIntakeEventType/, "ProjectIntakeEventType enum should exist");
assert.match(schema, /events\s+ProjectIntakeEvent\[\]/, "ProjectIntake should expose events");
assert.match(migration, /CREATE TABLE "ProjectIntakeEvent"/, "migration should create event table");
assert.match(service, /ProjectIntakeEventType\.CREATED/, "create should record CREATED");
assert.match(service, /ProjectIntakeEventType\.DETAILS_UPDATED/, "details update should record event");
assert.match(service, /ProjectIntakeEventType\.WITHDRAWN/, "withdraw should record event");
assert.match(service, /eventTypeForDecision/, "admin decisions should map to events");
assert.match(userPage, /项目时间线/, "user page should show visible timeline");
assert.doesNotMatch(service, /note:\s*current\.ideaText|note:\s*input\.reviewMessage/, "events should not store full user idea or review message");

console.log("project intake review event tests passed");
