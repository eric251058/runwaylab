import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const notificationsLib = readFileSync("src/lib/notifications.ts", "utf8");
const notificationClient = readFileSync("src/components/notifications/NotificationCenterClient.tsx", "utf8");

assert.match(notificationsLib, /const fallback = "\/notifications"/, "unsafe notification links should fall back to the message center");
assert.match(notificationsLib, /!url\.startsWith\("\/"\)/, "notification links must be relative paths");
assert.match(notificationsLib, /url\.startsWith\("\/\/"\)/, "scheme-relative notification links must be rejected");
assert.match(notificationsLib, /startsWith\("\/javascript:"\)/, "javascript URLs must be rejected even with a leading slash");
assert.match(notificationsLib, /startsWith\("\/data:"\)/, "data URLs must be rejected even with a leading slash");
assert.match(notificationsLib, /slice\(0,\s*500\)/, "stored notification links should have a bounded length");
assert.match(notificationsLib, /已隐藏邮箱/, "notification copy should redact email addresses");
assert.match(notificationsLib, /已隐藏手机号/, "notification copy should redact phone numbers");
assert.match(notificationsLib, /wechat\|微信\|whatsapp/, "notification copy should redact common direct-contact handles");
assert.match(notificationClient, /window\.location\.assign\(item\.targetUrl\)/, "UI should open server-sanitized target URLs only");
assert.doesNotMatch(notificationClient, /dangerouslySetInnerHTML/, "notification content must not render as raw HTML");

console.log("notification URL safety tests passed");
