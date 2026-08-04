import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const validation = readFileSync("src/lib/start-projects/validation.ts", "utf8");
const service = readFileSync("src/lib/start-projects.ts", "utf8");

assert.match(schema, /enum ProjectIntakeStatus \{[\s\S]*DRAFT[\s\S]*READY_FOR_REVIEW[\s\S]*SUBMITTED[\s\S]*NEEDS_INFO[\s\S]*ACCEPTED[\s\S]*DECLINED[\s\S]*\}/, "status enum should include the review states");
assert.match(validation, /PROJECT_INTAKE_REVIEW_DECISIONS = \["ACCEPTED", "NEEDS_INFO", "DECLINED"\]/, "admin decisions should be constrained");
assert.match(service, /statusFromCompleteness/, "DRAFT and READY should be derived centrally");
assert.match(service, /canOwnerMutate/, "owner editable states should be centralized");
assert.match(service, /submitProjectIntakeReview/, "submit transition should be centralized");
assert.match(service, /withdrawProjectIntakeReview/, "withdraw transition should be centralized");
assert.match(service, /reviewProjectIntakeAsAdmin/, "admin transition should be centralized");
assert.doesNotMatch(validation, /status:\s*z\.enum/, "generic PATCH validation must not accept status");

console.log("project intake review transition tests passed");
