import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const notificationClient = readFileSync("src/components/notifications/NotificationCenterClient.tsx", "utf8");
const notificationLib = readFileSync("src/lib/notifications.ts", "utf8");
const commentRoute = readFileSync("src/app/api/works/[id]/comments/route.ts", "utf8");
const repliesRoute = readFileSync("src/app/api/cooperation-requests/[id]/replies/route.ts", "utf8");
const adminWorkRoute = readFileSync("src/app/api/admin/works/[id]/route.ts", "utf8");
const ownerWorkRoute = readFileSync("src/app/api/works/[id]/route.ts", "utf8");
const incubationRoute = readFileSync("src/app/api/works/[id]/incubation-recommend/route.ts", "utf8");
const fabricStatusRoute = readFileSync("src/app/api/works/[id]/fabric-recommendations/[recommendationId]/route.ts", "utf8");
const proposalRoute = readFileSync("src/app/api/works/[id]/provider-proposals/route.ts", "utf8");
const contentLifecycleLib = readFileSync("src/lib/content-lifecycle.ts", "utf8");
const publicWorkRules = readFileSync("src/lib/works/rules.ts", "utf8");

assert.match(commentRoute, /recipientId:\s*work\.userId/, "commenting on another user's work should notify the owner");
assert.match(commentRoute, /actorId:\s*user\.id/, "commenting on your own work should not notify yourself");
assert.doesNotMatch(commentRoute, /recipientId.*body|parsed\.data\.recipientId/, "client must not provide the comment notification recipient");
assert.match(commentRoute, /prisma\.\$transaction[\s\S]*await createNotificationSafe/, "notification failure must not roll back comment creation");
assert.match(commentRoute, /safeNotificationSummary\(parsed\.data\.content,\s*160\)/, "comment notification should use a safe truncated summary");
assert.match(commentRoute, /targetUrl:\s*`\/works\/\$\{work\.id\}`/, "deleted comments should still leave a notification target that opens the work page");

assert.match(repliesRoute, /RequestStatus\.CLOSED \|\| inquiry\.status === RequestStatus\.COMPLETED/, "closed or completed inquiries must still reject new replies");
assert.match(fabricStatusRoute, /recommendation\.status !== RecommendationStatus\.PENDING/, "handled fabric recommendations must still reject repeat processing");
assert.match(proposalRoute, /work\.userId === user\.id/, "providers must still be blocked from proposing to their own works");

assert.match(adminWorkRoute, /action\.action === "offline"[\s\S]*NOTIFICATION_EVENTS\.WORK_OFFLINED/, "administrator offline action should notify the owner");
assert.match(ownerWorkRoute, /user\.role === "ADMIN" && updated\.userId !== user\.id/, "owner-initiated offline action should not create a self notification");
assert.match(ownerWorkRoute, /reviewStatus:\s*ReviewStatus\.OFFLINE[\s\S]*contentStatus:\s*ContentStatus\.OFFLINE/, "offline action must keep the work offline");
assert.match(ownerWorkRoute, /if \(action === "resubmit"\)[\s\S]*pendingVisibleState/, "restore logic should remain confined to the explicit resubmit action");
assert.doesNotMatch(notificationLib, /pendingVisibleState|ReviewStatus|ContentStatus/, "notification helpers must not restore or change work visibility");
assert.match(ownerWorkRoute, /targetUrl:\s*"\/me\?tab=works"/, "offline notification target should be available to the owner");
assert.match(publicWorkRules, /reviewStatus === ReviewStatus\.APPROVED[\s\S]*contentStatus === ContentStatus\.VISIBLE/, "offline works must remain hidden from visitors");

assert.match(incubationRoute, /incubationRecommendation\.create/, "incubation recommendation should use the stable creation entry");
assert.match(incubationRoute, /!result\.alreadyRecommended[\s\S]*NOTIFICATION_EVENTS\.INCUBATION_RECOMMENDED/, "only a newly-created incubation recommendation should notify");
assert.match(incubationRoute, /prisma\.\$transaction[\s\S]*await createNotificationSafe/, "incubation notification failure must not roll back the recommendation");
assert.match(incubationRoute, /targetUrl:\s*"\/me\/incubation"/, "incubation recommendation notification should use a safe in-site target");

assert.match(notificationClient, /markRead\(item\.id\)/, "opening a notification should only change notification read state first");
assert.doesNotMatch(notificationClient, /method:\s*"DELETE"/, "message center must not delete lifecycle objects");
assert.doesNotMatch(notificationLib, /prisma\.(work|cooperationRequest|fabric|providerWorkProposal)\.(update|delete)/, "notification helpers must not mutate lifecycle records");
assert.match(contentLifecycleLib, /canHardDeleteWork/, "content lifecycle helper should remain present");
assert.match(contentLifecycleLib, /canOfflineWork/, "content lifecycle helper should remain present");

console.log("notification lifecycle regression tests passed");
