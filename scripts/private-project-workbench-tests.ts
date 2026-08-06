import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const privateProjectLib = readFileSync("src/lib/private-collaboration-projects.ts", "utf8");
const meProjects = readFileSync("src/app/me/projects/page.tsx", "utf8");
const userDetail = readFileSync("src/app/me/projects/collaboration/[id]/page.tsx", "utf8");
const adminList = readFileSync("src/app/admin/projects/page.tsx", "utf8");
const adminDetail = readFileSync("src/app/admin/projects/[id]/page.tsx", "utf8");

assert.match(privateProjectLib, /actions:\s*\{[\s\S]*select:\s*privateProjectActionSelect[\s\S]*take:\s*50/, "private project queries should preload bounded action history");
assert.match(privateProjectLib, /events:\s*\{[\s\S]*select:\s*privateProjectEventSelect[\s\S]*take:\s*80/, "private project queries should preload bounded event history");
assert.doesNotMatch(privateProjectLib.replace(/\n/g, " "), /\.(forEach|map)\([^)]*=>[^)]*prisma\./, "private project workbench should avoid per-item database queries");
assert.match(meProjects, /privateProjectNextAction\(project\)/, "overview should summarize the real current action");
assert.match(userDetail, /PrivateProjectActionCard/, "user detail should include current action workflow");
assert.match(adminList, /getAdminPrivateProjects/, "admin projects page should include the private kickoff queue");
assert.match(adminDetail, /PrivateProjectActionPanel/, "admin detail should include the action control panel");

console.log("private project workbench tests passed");
