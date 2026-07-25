import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageSource = readFileSync("src/app/notifications/page.tsx", "utf8");
const clientSource = readFileSync("src/components/notifications/NotificationCenterClient.tsx", "utf8");
const navSource = readFileSync("src/components/layout/AuthNav.tsx", "utf8");

assert.match(pageSource, /dynamic = "force-dynamic"/, "notification page must render from fresh user data");
assert.match(pageSource, /redirect\("\/login\?next=\/notifications"\)/, "notification page must redirect guests");
assert.match(pageSource, /getNotificationsForUser/, "notification page must load current user notifications");
assert.match(clientSource, /ALL:\s*"全部"/, "notification center should include all tab");
assert.match(clientSource, /SOCIAL:\s*"互动"/, "notification center should include social tab");
assert.match(clientSource, /WORK:\s*"作品"/, "notification center should include work tab");
assert.match(clientSource, /INQUIRY:\s*"合作"/, "notification center should include inquiry tab");
assert.match(clientSource, /INCUBATION:\s*"孵化"/, "notification center should include incubation tab");
assert.match(clientSource, /\/api\/notifications\/read-all/, "notification center should support mark all read");
assert.match(clientSource, /\/api\/notifications\/\$\{id\}\/read/, "notification center should support single mark read");
assert.match(clientSource, /window\.location\.assign\(item\.targetUrl\)/, "notification open action should use sanitized target URLs");
assert.doesNotMatch(clientSource, /alert\(|window\.confirm/, "notification center should not use native blocking dialogs");
assert.match(navSource, /\/api\/notifications\/unread-count/, "navigation should fetch unread count");
assert.match(navSource, /href="\/notifications"/, "navigation should link to the notification center");
assert.match(navSource, /99\+/, "navigation should cap large unread badges");

console.log("notification UI tests passed");
