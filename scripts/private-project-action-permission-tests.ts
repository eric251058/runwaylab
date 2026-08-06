import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/lib/private-project-actions.ts", "utf8");
const adminCreateRoute = readFileSync("src/app/api/admin/projects/[id]/actions/route.ts", "utf8");
const adminCompleteRoute = readFileSync("src/app/api/admin/projects/[id]/actions/[actionId]/complete/route.ts", "utf8");
const adminCancelRoute = readFileSync("src/app/api/admin/projects/[id]/actions/[actionId]/cancel/route.ts", "utf8");
const userSubmitRoute = readFileSync("src/app/api/me/projects/collaboration/[id]/actions/[actionId]/submit/route.ts", "utf8");

assert.match(adminCreateRoute, /requireAdminUser\(\)/, "admin action create route must use admin guard");
assert.match(adminCompleteRoute, /requireAdminUser\(\)/, "admin action complete route must use admin guard");
assert.match(adminCancelRoute, /requireAdminUser\(\)/, "admin action cancel route must use admin guard");
assert.match(userSubmitRoute, /getCurrentUser\(\)/, "user submit route must use the current session user");
assert.match(service, /ownerUserId:\s*user\.id/, "user submit must be scoped to the project owner");
assert.doesNotMatch(`${adminCreateRoute}\n${adminCompleteRoute}\n${adminCancelRoute}\n${userSubmitRoute}`, /ownerUserId|completedById|cancelledById|createdById/, "routes must not accept ownership or actor fields from clients");
assert.match(service, /createdById:\s*admin\.id/, "createdById should come from the admin session");
assert.match(service, /completedById:\s*admin\.id/, "completedById should come from the admin session");
assert.match(service, /cancelledById:\s*admin\.id/, "cancelledById should come from the admin session");

console.log("private project action permission tests passed");
