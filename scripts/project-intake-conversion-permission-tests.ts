import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("src/app/api/admin/project-intakes/[id]/convert/route.ts", "utf8");
const service = readFileSync("src/lib/start-projects.ts", "utf8");
const validation = readFileSync("src/lib/start-projects/validation.ts", "utf8");
const privateProjectService = readFileSync("src/lib/private-collaboration-projects.ts", "utf8");

assert.match(route, /getCurrentUser\(\)/, "conversion route should derive admin from session");
assert.match(route, /convertProjectIntakeToProject\(id, admin, body\)/, "route should pass session admin to service");
assert.match(service, /if \(!isActiveAdmin\(admin\)\)/, "conversion service should require active admin");
assert.match(validation, /projectIntakeConversionSchema[\s\S]*expectedUpdatedAt[\s\S]*\.strict\(\)/, "conversion body should be strict");
assert.doesNotMatch(validation, /projectIntakeConversionSchema[\s\S]*(ownerId|status|completion|convertedById|reviewedById)/, "conversion body must not accept protected fields");
assert.match(service, /ownerUserId:\s*current\.ownerId/, "formal project owner should come from the intake owner");
assert.match(service, /convertedById:\s*admin\.id/, "converter should come from session admin");
assert.match(privateProjectService, /canViewPrivateProject/, "private project access should be centralized");
assert.match(privateProjectService, /project\.ownerUserId === user\.id[\s\S]*project\.designerId === user\.id[\s\S]*project\.provider\?\.ownerId === user\.id[\s\S]*project\.projectIntake\?\.ownerId === user\.id/, "private project should be limited to the owner, assigned collaborators, or an active admin");

console.log("project intake conversion permission tests passed");
