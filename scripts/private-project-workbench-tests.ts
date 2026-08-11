import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const privateProjectLib = readFileSync("src/lib/private-collaboration-projects.ts", "utf8");
const meProjects = readFileSync("src/app/me/projects/page.tsx", "utf8");
const userDetail = readFileSync("src/app/me/projects/collaboration/[id]/page.tsx", "utf8");
const adminList = readFileSync("src/app/admin/projects/page.tsx", "utf8");
const adminDetail = readFileSync("src/app/admin/projects/[id]/page.tsx", "utf8");
const privateProjectActions = readFileSync("src/lib/private-project-actions.ts", "utf8");

assert.match(privateProjectLib, /actions:\s*\{[\s\S]*select:\s*privateProjectActionSelect[\s\S]*take:\s*50/, "private project queries should preload bounded action history");
assert.match(privateProjectLib, /events:\s*\{[\s\S]*select:\s*privateProjectEventSelect[\s\S]*take:\s*80/, "private project queries should preload bounded event history");
assert.doesNotMatch(privateProjectLib.replace(/\n/g, " "), /\.(forEach|map)\([^)]*=>[^)]*prisma\./, "private project workbench should avoid per-item database queries");
assert.match(meProjects, /privateProjectNextAction\(project\)/, "overview should summarize the real current action");
assert.match(userDetail, /PrivateProjectActionCard/, "user detail should include current action workflow");
assert.match(adminList, /getAdminPrivateProjects/, "admin projects page should include the private kickoff queue");
assert.match(adminDetail, /PrivateProjectActionPanel/, "admin detail should include the action control panel");
assert.match(privateProjectActions, /export function getAdminPrivateProjectWhere/, "admin private project filters should be centralized in the service layer");
assert.match(privateProjectActions, /activePlatformActionWhere/, "admin pending filters should model PLATFORM + ACTIVE explicitly");
assert.match(privateProjectActions, /waitingConfirmationActionWhere/, "admin pending filters should model WAITING_PLATFORM_CONFIRMATION explicitly");
assert.match(privateProjectActions, /endedPrivateProjectActionWhere/, "admin pending filters should model completed or cancelled actions for next-step planning");
assert.match(privateProjectActions, /filter === "NO_ACTION"[\s\S]*actions:\s*\{\s*none:\s*\{\}\s*\}/, "NO_ACTION should mean no action has ever been created");
assert.match(privateProjectActions, /filter === "WAITING_USER"[\s\S]*some:\s*activeUserActionWhere\(\)/, "WAITING_USER should include USER + ACTIVE");
assert.match(privateProjectActions, /filter === "WAITING_PLATFORM"[\s\S]*some:\s*activePlatformActionWhere\(\)/, "WAITING_PLATFORM should include PLATFORM + ACTIVE");
assert.match(privateProjectActions, /filter === "WAITING_CONFIRMATION"[\s\S]*some:\s*waitingConfirmationActionWhere\(\)/, "WAITING_CONFIRMATION should include USER + WAITING_PLATFORM_CONFIRMATION");
assert.match(privateProjectActions, /filter === "WAITING_NEXT"[\s\S]*none:\s*openPrivateProjectActionWhere\(\)[\s\S]*some:\s*endedPrivateProjectActionWhere\(\)/, "WAITING_NEXT should include ended actions with no open action");
assert.match(adminList, /maintenanceMode/, "admin projects page should gate heavy maintenance queries behind maintenance mode");
assert.match(adminList, /privateProjectAdminReasonLabel\(project\.actions\)/, "admin list should show a business reason for pending items");
assert.match(adminList, /returnTo=\$\{encodeURIComponent\(listHref\)\}/, "admin list should preserve filter context when opening detail");

console.log("private project workbench tests passed");
