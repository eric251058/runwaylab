import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");

assert.match(schema, /enum ProjectIntakeStatus \{\s*DRAFT\s*READY_FOR_REVIEW\s*\}/, "schema should define the minimal ProjectIntakeStatus enum");
assert.match(schema, /model ProjectIntake \{/, "schema should define ProjectIntake");
assert.match(schema, /ownerId\s+String/, "ProjectIntake should have ownerId");
assert.match(schema, /clientDraftId\s+String/, "ProjectIntake should have clientDraftId");
assert.match(schema, /sourceType\s+String/, "ProjectIntake should store sourceType as safely validated string");
assert.match(schema, /category\s+String/, "ProjectIntake should store category as safely validated string");
assert.match(schema, /primaryNeed\s+String/, "ProjectIntake should store primaryNeed as safely validated string");
assert.match(schema, /status\s+ProjectIntakeStatus\s+@default\(DRAFT\)/, "ProjectIntake should default to DRAFT");
assert.match(schema, /linkedWorkId\s+String\?/, "ProjectIntake should optionally link Work later");
assert.match(schema, /linkedCollaborationProjectId\s+String\?/, "ProjectIntake should optionally link CollaborationProject later");
assert.match(schema, /linkedIncubationProjectId\s+String\?/, "ProjectIntake should optionally link IncubationProject later");
assert.match(schema, /@@unique\(\[ownerId, clientDraftId\]\)/, "ProjectIntake should prevent duplicate creates by owner and clientDraftId");
assert.match(schema, /projectIntakes\s+ProjectIntake\[\]/, "User should expose projectIntakes relation");
const workModel = schema.match(/model Work \{[\s\S]*?\n\}/)?.[0] ?? "";
assert.doesNotMatch(workModel, /clientDraftId|sourceType|primaryNeed/, "Work must not be used as the 60-second start draft model");

console.log("start project schema tests passed");
