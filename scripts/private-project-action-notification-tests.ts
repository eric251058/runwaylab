import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/lib/private-project-actions.ts", "utf8");
const notifications = readFileSync("src/lib/notifications.ts", "utf8");

assert.match(service, /createPrivateProjectNotification/, "action service should notify the project owner");
assert.match(service, /safeNotificationSummary/, "notifications should sanitize text before storing");
assert.match(service, /sanitizeNotificationTargetUrl\(privateProjectHref\(input\.projectId\)\)/, "notification link should be normalized");
assert.match(service, /NotificationType\.REQUEST_HANDLED/, "private project action notifications should use an existing safe notification type");
assert.match(notifications, /redactContactSecrets/, "notification utilities should redact private contact details");
assert.doesNotMatch(service, /AI_API_KEY|DATABASE_URL|SESSION_SECRET|Authorization/, "action service logs and notifications must not reference secrets");

console.log("private project action notification tests passed");
