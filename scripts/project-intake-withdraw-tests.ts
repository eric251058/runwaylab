import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const routePath = "src/app/api/start-projects/[id]/withdraw/route.ts";
const service = readFileSync("src/lib/start-projects.ts", "utf8");
const route = readFileSync(routePath, "utf8");

assert.equal(existsSync(routePath), true, "withdraw route should exist");
assert.match(route, /getCurrentUser\(\)/, "withdraw route should read the session user");
assert.match(route, /withdrawProjectIntakeReview\(id, user\)/, "withdraw route should delegate to centralized service");
assert.match(service, /current\.status !== ProjectIntakeStatus\.SUBMITTED/, "withdraw should only handle SUBMITTED");
assert.match(service, /current\.ownerId !== user\.id/, "only owner can withdraw");
assert.match(service, /submittedForReviewAt:\s*null/, "withdraw should clear the active submitted timestamp");
assert.match(service, /ProjectIntakeEventType\.WITHDRAWN/, "withdraw should write an event");
assert.match(service, /statusFromCompleteness|completion === 100 \? ProjectIntakeStatus\.READY_FOR_REVIEW : ProjectIntakeStatus\.DRAFT/, "withdraw should return to DRAFT or READY based on completeness");
assert.doesNotMatch(service, /deleteMany\(\{[\s\S]*projectIntakeEvent/, "withdraw must not delete history");

console.log("project intake withdraw tests passed");
