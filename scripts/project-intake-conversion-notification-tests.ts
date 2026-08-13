import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/lib/start-projects.ts", "utf8");
const api = readFileSync("src/app/api/admin/project-intakes/[id]/convert/route.ts", "utf8");

assert.match(service, /createProjectIntakeConvertedNotification/, "conversion notification helper should exist");
assert.match(service, /privateCollaborationProjectHref\(input\.projectId\)/, "notification should link to the private project workbench");
assert.match(service, /项目已启动/, "notification copy should be user-readable");
assert.match(service, /safeNotificationSummary/, "notification content should be safely summarized");
assert.match(service, /sanitizeNotificationTargetUrl/, "notification link should be sanitized");
assert.match(service, /type:\s*NotificationType\.REQUEST_HANDLED/, "notification should use an existing safe notification type");
assert.match(api, /href:\s*privateCollaborationProjectHref\(result\.project\.id\)/, "API should return the private project href");

console.log("project intake conversion notification tests passed");
