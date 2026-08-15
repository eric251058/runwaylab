import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path: string) {
  return readFileSync(path, "utf8");
}

const publicRules = source("src/lib/works/rules.ts");
assert.match(publicRules, /visibility:\s*WorkVisibility\.PUBLIC/);
assert.match(publicRules, /work\.visibility\s*===\s*WorkVisibility\.PUBLIC/);

const publicSelect = source("src/lib/works/public.ts");
assert.match(publicSelect, /visibility:\s*true/);
const shareSelect = source("src/lib/work-share-data.ts");
assert.match(shareSelect, /visibility:\s*true/);

const workspacePage = source("src/app/me/workspaces/[id]/page.tsx");
const accessCheck = workspacePage.indexOf("canViewWorkspace({");
const privateQueries = workspacePage.indexOf("Promise.all([");
assert.ok(accessCheck >= 0 && privateQueries > accessCheck, "workspace access must be checked before private queries");
assert.match(workspacePage, /visibility:\s*WorkVisibility\.PUBLIC/);
assert.match(workspacePage, /reviewStatus:\s*ReviewStatus\.APPROVED/);
assert.match(workspacePage, /contentStatus:\s*ContentStatus\.VISIBLE/);
assert.match(workspacePage, /visibility:\s*CollaborationProjectVisibility\.PUBLIC/);
assert.match(workspacePage, /canSeeMemberEmail\s*\?/);

const workDetail = source("src/app/works/[id]/page.tsx");
assert.match(workDetail, /canViewWork\(\{/);
assert.match(workDetail, /work\.visibility\s*===\s*"PUBLIC"/);

const invitationRoute = source("src/app/api/workspace-invitations/[token]/route.ts");
assert.match(invitationRoute, /status:\s*"PENDING"/);
assert.match(invitationRoute, /claimed\.count\s*!==\s*1/);

const ownershipRoute = source("src/app/api/workspaces/[id]/ownership/route.ts");
assert.match(ownershipRoute, /where:\s*\{\s*id,\s*ownerId:\s*user\.id\s*\}/);
assert.match(ownershipRoute, /role:\s*"OWNER"/);

const memberRoute = source("src/app/api/workspaces/[id]/members/[memberId]/route.ts");
assert.match(memberRoute, /role:\s*\{\s*not:\s*"OWNER"\s*\}/);

const selfMemberRoute = source("src/app/api/workspaces/[id]/members/me/route.ts");
assert.match(selfMemberRoute, /updateMany\(\{/);
assert.match(selfMemberRoute, /role:\s*\{\s*not:\s*"OWNER"\s*\}/);

console.log("workspace-privacy-contract-tests: PASS");
