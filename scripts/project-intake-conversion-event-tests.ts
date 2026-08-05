import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const service = readFileSync("src/lib/start-projects.ts", "utf8");
const validation = readFileSync("src/lib/start-projects/validation.ts", "utf8");
const privateProjectService = readFileSync("src/lib/private-collaboration-projects.ts", "utf8");

assert.match(schema, /enum ProjectIntakeEventType \{[\s\S]*CONVERTED[\s\S]*\}/, "event enum should include CONVERTED");
assert.match(validation, /PROJECT_INTAKE_EVENT_VALUES = \[[\s\S]*"CONVERTED"[\s\S]*\]/, "validation should allow CONVERTED event type");
assert.match(service, /CONVERTED:\s*"项目已转为正式项目"/, "event label should be user-readable");
assert.match(service, /eventType:\s*ProjectIntakeEventType\.CONVERTED/, "conversion should write a CONVERTED intake event");
assert.match(privateProjectService, /PROJECT_INTAKE_EVENT_LABELS\[event\.eventType\]/, "private project timeline should reuse intake event labels");

console.log("project intake conversion event tests passed");
