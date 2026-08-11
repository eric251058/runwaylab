import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/lib/private-project-actions.ts", "utf8");
const adminPage = readFileSync("src/app/admin/projects/page.tsx", "utf8");

assert.match(service, /export function getAdminPrivateProjectWhere/, "admin private project filters should be centralized in the service layer");
assert.match(service, /activePlatformActionWhere/, "service should model platform-owned active actions explicitly");
assert.match(service, /waitingConfirmationActionWhere/, "service should model user results waiting for platform confirmation explicitly");
assert.match(service, /endedPrivateProjectActionWhere/, "service should model completed or cancelled actions for next-step planning");
assert.match(service, /filter === "NO_ACTION"[\s\S]*actions:\s*\{\s*none:\s*\{\}\s*\}/, "NO_ACTION should mean no action has ever been created");
assert.match(service, /filter === "WAITING_USER"[\s\S]*some:\s*activeUserActionWhere\(\)/, "WAITING_USER should include USER + ACTIVE");
assert.match(service, /filter === "WAITING_PLATFORM"[\s\S]*some:\s*activePlatformActionWhere\(\)/, "WAITING_PLATFORM should include PLATFORM + ACTIVE");
assert.match(service, /filter === "WAITING_CONFIRMATION"[\s\S]*some:\s*waitingConfirmationActionWhere\(\)/, "WAITING_CONFIRMATION should include USER + WAITING_PLATFORM_CONFIRMATION");
assert.match(service, /filter === "WAITING_NEXT"[\s\S]*none:\s*openPrivateProjectActionWhere\(\)[\s\S]*some:\s*endedPrivateProjectActionWhere\(\)/, "WAITING_NEXT should include ended actions with no open action");

const todoBlock = service.match(/if \(filter === "ALL_PRIVATE"\) return baseWhere;[\s\S]*?return \{\s*\.\.\.baseWhere,[\s\S]*?OR:\s*\[[\s\S]*?\]\s*\};\s*\}/)?.[0] ?? "";
assert.match(todoBlock, /some:\s*waitingConfirmationActionWhere\(\)/, "default TODO should include waiting confirmation");
assert.match(todoBlock, /some:\s*activePlatformActionWhere\(\)/, "default TODO should include PLATFORM + ACTIVE");
assert.match(todoBlock, /actions:\s*\{\s*none:\s*\{\}\s*\}/, "default TODO should include projects with no actions");
assert.match(todoBlock, /some:\s*endedPrivateProjectActionWhere\(\)/, "default TODO should include ended actions with no next action");
assert.doesNotMatch(todoBlock, /activeUserActionWhere\(\)/, "default TODO should exclude USER + ACTIVE");

assert.match(service, /privateProjectActionListSelect/, "admin list should use a lightweight action select");
assert.match(service, /select:\s*privateProjectActionListSelect/, "admin list query should not load full action detail text");
assert.match(adminPage, /privateProjectAdminReasonLabel\(project\.actions\)/, "admin list should show a business reason for pending items");
assert.match(adminPage, /returnTo=\$\{encodeURIComponent\(listHref\)\}/, "admin list should preserve filter context when opening detail");

console.log("admin private project pending tests passed");
