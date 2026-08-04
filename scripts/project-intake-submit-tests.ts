import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const routePath = "src/app/api/start-projects/[id]/submit/route.ts";
const service = readFileSync("src/lib/start-projects.ts", "utf8");
const route = readFileSync(routePath, "utf8");

assert.equal(existsSync(routePath), true, "submit route should exist");
assert.match(route, /getCurrentUser\(\)/, "submit route should read the session user");
assert.match(route, /submitProjectIntakeReview\(id, user\)/, "submit route should delegate to centralized service");
assert.match(service, /prisma\.\$transaction/, "submit should be transactional");
assert.match(service, /current\.ownerId !== user\.id/, "only owner can submit");
assert.match(service, /READY_FOR_REVIEW[\s\S]*NEEDS_INFO/, "READY_FOR_REVIEW and NEEDS_INFO should be submit sources");
assert.match(service, /ProjectIntakeStatus\.SUBMITTED/, "submit should set SUBMITTED");
assert.match(service, /submittedForReviewAt/, "submit should set submittedForReviewAt");
assert.match(service, /ProjectIntakeEventType\.SUBMITTED|ProjectIntakeEventType\.RESUBMITTED/, "submit should create submitted or resubmitted events");
assert.match(service, /idempotent:\s*true/, "duplicate submit should be idempotent");

console.log("project intake submit tests passed");
