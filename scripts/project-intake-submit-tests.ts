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
assert.match(service, /READY_FOR_REVIEW[\s\S]*NEEDS_INFO[\s\S]*SUBMITTED[\s\S]*ACCEPTED/, "launch should accept complete review-era sources without admin review");
assert.match(service, /status:\s*ProjectIntakeStatus\.ACCEPTED/, "launch should move the intake into an accepted internal state");
assert.match(service, /submittedForReviewAt/, "submit should set submittedForReviewAt");
assert.match(service, /tx\.collaborationProject\.create/, "launch should automatically create a private project");
assert.match(service, /createInitialPrivateProjectActionForIntake/, "launch should automatically create the first action");
assert.match(route, /href:\s*success\.project \? privateCollaborationProjectHref\(success\.project\.id\)/, "submit API should return the private project href after launch");
assert.match(service, /ProjectIntakeEventType\.SUBMITTED|ProjectIntakeEventType\.RESUBMITTED/, "submit should create submitted or resubmitted events");
assert.match(service, /idempotent:\s*true/, "duplicate submit should be idempotent");

console.log("project intake submit tests passed");
