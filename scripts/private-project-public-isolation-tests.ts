import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const commercial = readFileSync("src/lib/commercial-collaboration.ts", "utf8");
const proposalRoute = readFileSync("src/app/api/projects/[id]/proposals/route.ts", "utf8");
const privateService = readFileSync("src/lib/private-project-actions.ts", "utf8");
const meRoute = readFileSync("src/app/api/me/projects/collaboration/[id]/actions/[actionId]/submit/route.ts", "utf8");

assert.match(commercial, /visibility:\s*CollaborationProjectVisibility\.PUBLIC/, "public project queries should require PUBLIC visibility");
assert.match(proposalRoute, /if \(!project\.workId\)/, "public proposal route should reject projects not backed by public works");
assert.match(privateService, /visibility:\s*CollaborationProjectVisibility\.PRIVATE/, "private kickoff actions should stay on PRIVATE projects");
assert.match(meRoute, /\/login\?next=\/me\/projects\/collaboration/, "private user route should require login for private project access");
assert.doesNotMatch(`${commercial}\n${proposalRoute}`, /CollaborationProjectAction|CollaborationProjectEvent/, "public marketplace code should not expose private kickoff actions");

console.log("private project public isolation tests passed");
