import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/lib/start-projects.ts", "utf8");

assert.match(service, /createProjectIntakeNotification/, "admin decisions should create project intake notifications");
assert.match(service, /NotificationType\.REQUEST_HANDLED/, "notifications should reuse existing stored type");
assert.match(service, /sanitizeNotificationTargetUrl/, "notification URLs should use the existing sanitizer");
assert.match(service, /safeNotificationSummary/, "notification copy should be compacted safely");
assert.match(service, /项目需要补充资料/, "NEEDS_INFO notification title should exist");
assert.match(service, /项目已通过平台评估/, "ACCEPTED notification title should exist");
assert.match(service, /项目评估已有结果/, "DECLINED notification title should exist");
assert.match(service, /findFirst\(\{[\s\S]*notification/, "notifications should dedupe recent duplicates");
assert.doesNotMatch(
  service,
  /sendSms|sendEmail|pushNotification|nodemailer|twilio|短信发送|邮件发送/i,
  "review notifications must not enable external messaging",
);

console.log("project intake review notification tests passed");
