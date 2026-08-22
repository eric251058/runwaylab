import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const page=readFileSync("src/app/me/workspaces/[id]/teaching/page.tsx","utf8");
const action=readFileSync("src/app/me/workspaces/[id]/teaching/actions.ts","utf8");
const workspace=readFileSync("src/app/me/workspaces/[id]/page.tsx","utf8");
const checks:[string,boolean][]=[
["page management helper",/canManageWorkspace/.test(page)],
["page admin role",/role\s*===\s*"ADMIN"/.test(page)],
["page owner boundary",/ownerId\s*===/.test(page)],
["page denial",/notFound\(\)/.test(page)],
["tag max",/max\(30\)/.test(action)],
["note bounds",/min\(2\)[\s\S]*max\(500\)/.test(action)],
["action admin",/role\s*===\s*"ADMIN"/.test(action)],
["action owner",/ownerId\s*===/.test(action)],
["action manager",/canManageWorkspace\(access\)/.test(action)],
["cross-workspace boundary",/where:\s*\{\s*id:\s*workId,\s*workspaceId\s*\}/.test(action)],
["recommendation create",/teacherRecommendedWork\.create/.test(action)],
["cache revalidation",/revalidatePath/.test(action)],
["workspace gate",/canOpenTeaching/.test(workspace)],
["workspace link",/\/teaching/.test(workspace)]
];
const missing=checks.filter(([,ok])=>!ok).map(([name])=>name);
assert.deepEqual(missing,[]);
console.log("teaching-ui-tests: PASS");
