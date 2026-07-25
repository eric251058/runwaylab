import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const listRoute = readFileSync("src/app/api/notifications/route.ts", "utf8");
const countRoute = readFileSync("src/app/api/notifications/unread-count/route.ts", "utf8");
const readRoute = readFileSync("src/app/api/notifications/[id]/read/route.ts", "utf8");
const readAllRoute = readFileSync("src/app/api/notifications/read-all/route.ts", "utf8");
const notificationsLib = readFileSync("src/lib/notifications.ts", "utf8");

assert.match(listRoute, /getCurrentUser\(\)/, "notification list must require the current user");
assert.match(listRoute, /user\.id/, "notification list must scope queries to the current user");
assert.doesNotMatch(listRoute, /searchParams\.get\(["']userId["']\)|recipientId/, "notification list must not accept a target user from the request");
assert.match(countRoute, /getCurrentUser\(\)/, "unread count must require the current user");
assert.match(readRoute, /getCurrentUser\(\)/, "single read endpoint must require the current user");
assert.match(readRoute, /markNotificationRead\(user\.id, id\)/, "single read endpoint must pass current user ownership to the helper");
assert.match(readRoute, /status:\s*404/, "single read endpoint must hide non-owned notifications as not found");
assert.match(readAllRoute, /markAllNotificationsRead\(user\.id\)/, "read-all endpoint must scope updates to the current user");
assert.match(notificationsLib, /where:\s*\{\s*id:\s*notificationId,\s*userId\s*\}/, "read helper must verify notification ownership");
assert.match(notificationsLib, /where:\s*\{\s*userId,\s*isRead:\s*false\s*\}/, "read-all helper must update only the user's unread messages");

console.log("notification permission tests passed");
