import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20260805193000_add_private_project_kickoff_flow/migration.sql", "utf8");
const service = readFileSync("src/lib/private-project-actions.ts", "utf8");
const startProjects = readFileSync("src/lib/start-projects.ts", "utf8");
const privateProjectLib = readFileSync("src/lib/private-collaboration-projects.ts", "utf8");

assert.match(schema, /enum CollaborationProjectEventType \{[\s\S]*PROJECT_CREATED[\s\S]*ACTION_CREATED[\s\S]*USER_RESULT_SUBMITTED[\s\S]*ACTION_COMPLETED[\s\S]*ACTION_CANCELLED[\s\S]*\}/, "schema should define all private project event types");
assert.match(migration, /CREATE TABLE "CollaborationProjectEvent"/, "migration should create CollaborationProjectEvent");
assert.match(service, /eventType:\s*CollaborationProjectEventType\.ACTION_CREATED/, "creating an action should create an action event");
assert.match(service, /eventType:\s*CollaborationProjectEventType\.USER_RESULT_SUBMITTED/, "submitting result should create a user event");
assert.match(service, /eventType:\s*CollaborationProjectEventType\.ACTION_COMPLETED/, "completing action should create a completion event");
assert.match(service, /eventType:\s*CollaborationProjectEventType\.ACTION_CANCELLED/, "cancelling action should create a cancel event");
assert.match(startProjects, /createProjectCreatedEventForConversion/, "conversion should create formal project event");
assert.match(privateProjectLib, /PRIVATE_PROJECT_EVENT_LABELS\[event\.eventType\]/, "private timeline should render project event labels");

console.log("private project action event tests passed");
