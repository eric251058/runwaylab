import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/lib/start-projects.ts", "utf8");
const validation = readFileSync("src/lib/start-projects/validation.ts", "utf8");

assert.match(service, /calculateProjectIntakeCompletion/, "completion should be calculated by a server helper");
assert.match(service, /projectIntakeMissingFields/, "missing fields should be derived server-side");
assert.match(service, /sourceType[\s\S]*category[\s\S]*primaryNeed[\s\S]*ideaText[\s\S]*targetAudience[\s\S]*useScenario[\s\S]*expectedPriceBand[\s\S]*launchTiming/, "completion should consider the real required fields");
assert.match(service, /statusFromCompleteness/, "READY_FOR_REVIEW should be derived from completeness");
assert.match(validation, /UNSURE/, "uncertain answers should be allowed and count as answers");
assert.doesNotMatch(validation, /completion\s*:/, "clients must not submit completion in patch validation");
assert.doesNotMatch(validation, /reviewedById|reviewedAt|submittedForReviewAt|ownerId/, "clients must not submit protected project intake fields");
assert.match(service, /completion:\s*calculateProjectIntakeCompletion|completion,\s*submittedForReviewAt/, "completion should be written by the service");

console.log("project intake completeness tests passed");
