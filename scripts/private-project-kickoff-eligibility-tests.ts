import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const service = readFileSync("src/lib/private-project-actions.ts", "utf8");
const adminDetail = readFileSync("src/app/admin/projects/[id]/page.tsx", "utf8");

assert.match(schema, /model CollaborationProjectAction \{[\s\S]*project\s+CollaborationProject[\s\S]*onDelete: Cascade/, "actions should belong to CollaborationProject and cascade with the project");
assert.match(schema, /model CollaborationProjectEvent \{[\s\S]*project\s+CollaborationProject[\s\S]*onDelete: Cascade/, "events should belong to CollaborationProject and cascade with the project");
assert.match(service, /visibility:\s*CollaborationProjectVisibility\.PRIVATE/, "action service should only handle private projects");
assert.match(service, /status:\s*CollaborationProjectStatus\.DRAFT/, "action service should only handle formal private draft projects");
assert.match(service, /ownerUserId:\s*\{\s*not:\s*null\s*\}/, "admin queue should only include owner-bound private projects");
assert.match(adminDetail, /getAdminPrivateProjectDetail\(id,\s*admin\)/, "admin detail should re-check access through the service");

console.log("private project kickoff eligibility tests passed");
