import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bottomTab = readFileSync("src/components/layout/BottomTabBar.tsx", "utf8");
const mePage = readFileSync("src/app/me/page.tsx", "utf8");

assert.ok(bottomTab.includes('fetch("/api/notifications/unread-count"'));
assert.ok(bottomTab.includes('item.href === "/me" && unreadCount > 0'));
assert.ok(bottomTab.includes('aria-label={`${unreadLabel} 条未读消息`}'));
assert.ok(bottomTab.includes('unreadCount > 99 ? "99+"'));
assert.ok(bottomTab.includes('[pathname]'));

assert.ok(mePage.includes("unreadNotificationCount"));
assert.ok(mePage.includes("prisma.notification.count"));
assert.ok(mePage.includes("userId: user.id, isRead: false"));
assert.ok(mePage.includes('href="/notifications"'));
assert.ok(mePage.includes("消息中心"));
assert.ok(mePage.includes("条未读"));

console.log("Mobile notification discovery contract: PASS");
