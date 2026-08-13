import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/lib/private-project-actions.ts", "utf8");
const route = readFileSync("src/app/api/me/projects/collaboration/[id]/actions/[actionId]/submit/route.ts", "utf8");
const component = readFileSync("src/components/projects/PrivateProjectActionCard.tsx", "utf8");

assert.match(service, /responsibility !== CollaborationProjectActionResponsibility\.USER/, "only user-responsible actions should accept user results");
assert.match(service, /status:\s*CollaborationProjectActionStatus\.WAITING_PLATFORM_CONFIRMATION/, "user result should move the action into waiting confirmation");
assert.match(service, /userResultNote:\s*parsed\.data\.completionNote/, "user result note should be stored on the action");
assert.match(service, /userResultSubmittedAt:\s*new Date\(\)/, "user result submit time should be server generated");
assert.match(route, /submitPrivateProjectActionResult\(id,\s*actionId,\s*user,\s*body\)/, "route should delegate to service with session user");
assert.match(component, /继续[\s\S]*完成/, "user UI should expose one simple continue-then-complete flow");
assert.doesNotMatch(component, /window\.confirm|alert\(/, "user action UI should avoid browser modal prompts");

console.log("private project user result tests passed");
