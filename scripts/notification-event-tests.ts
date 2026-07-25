import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const notificationsLib = readFileSync("src/lib/notifications.ts", "utf8");
const fabricHelper = readFileSync("src/lib/fabric-recommendations.ts", "utf8");
const adminWorkRoute = readFileSync("src/app/api/admin/works/[id]/route.ts", "utf8");
const ownerWorkRoute = readFileSync("src/app/api/works/[id]/route.ts", "utf8");
const commentRoute = readFileSync("src/app/api/works/[id]/comments/route.ts", "utf8");
const inquiryRoute = readFileSync("src/app/api/cooperation-requests/route.ts", "utf8");
const contactRoute = readFileSync("src/app/api/cooperation-requests/[id]/contact/route.ts", "utf8");
const repliesRoute = readFileSync("src/app/api/cooperation-requests/[id]/replies/route.ts", "utf8");
const incubationRoute = readFileSync("src/app/api/works/[id]/incubation-recommend/route.ts", "utf8");
const fabricRoute = readFileSync("src/app/api/works/[id]/fabric-recommendations/route.ts", "utf8");
const fabricStatusRoute = readFileSync("src/app/api/works/[id]/fabric-recommendations/[recommendationId]/route.ts", "utf8");
const proposalRoute = readFileSync("src/app/api/works/[id]/provider-proposals/route.ts", "utf8");
const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
const reportSource = readFileSync("RUNWAYLAB_NOTIFICATION_CENTER_V2_0B_4_1_REPORT.md", "utf8");
const likeRoute = readFileSync("src/app/api/works/[id]/like/route.ts", "utf8");
const favoriteRoute = readFileSync("src/app/api/works/[id]/favorite/route.ts", "utf8");

const wiredEvents = [
  "COMMENT_CREATED",
  "WORK_APPROVED",
  "WORK_REJECTED",
  "WORK_OFFLINED",
  "INCUBATION_RECOMMENDED",
  "INCUBATION_CANDIDATE",
  "INQUIRY_RECEIVED",
  "INQUIRY_REPLIED",
  "FABRIC_RECOMMENDED",
  "PROVIDER_PROPOSAL_RECEIVED",
  "PROVIDER_PROPOSAL_UPDATED",
  "REQUEST_HANDLED"
];

for (const event of wiredEvents) {
  assert.match(notificationsLib, new RegExp(`${event}: "${event}"`), `${event} should be declared in the unified event list`);
  assert.match(reportSource, new RegExp("`" + event + "`"), `${event} should be listed in the delivery report`);
}

assert.match(commentRoute, /NOTIFICATION_EVENTS\.COMMENT_CREATED/, "creating a comment on another user's work should notify the owner");
assert.match(commentRoute, /recipientId:\s*work\.userId/, "comment recipient must come from the server-side work owner");
assert.doesNotMatch(commentRoute, /recipientId.*body|body.*recipientId|parsed\.data\.recipientId/, "comment API must not accept recipientId from the client");
assert.match(commentRoute, /actorId:\s*user\.id/, "comment notifications must suppress self-notification");
assert.match(commentRoute, /safeNotificationSummary\(parsed\.data\.content,\s*160\)/, "comment notifications must store a bounded safe summary");
assert.match(commentRoute, /targetUrl:\s*`\/works\/\$\{work\.id\}`/, "comment notification target should be the in-site work page");
assert.match(commentRoute, /prisma\.\$transaction[\s\S]*createNotificationSafe/, "comment notification should run after comment creation succeeds");

assert.match(adminWorkRoute, /NOTIFICATION_EVENTS\.WORK_APPROVED/, "admin approval should notify the author");
assert.match(adminWorkRoute, /NOTIFICATION_EVENTS\.WORK_REJECTED/, "admin rejection should notify the author");
assert.match(adminWorkRoute, /NOTIFICATION_EVENTS\.WORK_OFFLINED/, "admin offline action should notify the author");
assert.match(adminWorkRoute, /NOTIFICATION_EVENTS\.INCUBATION_CANDIDATE/, "admin incubation candidate action should notify the author");
assert.match(ownerWorkRoute, /user\.role === "ADMIN" && updated\.userId !== user\.id/, "owner-initiated offline action must not notify the owner");
assert.match(ownerWorkRoute, /NOTIFICATION_EVENTS\.WORK_OFFLINED/, "admin offline action through the work lifecycle route should notify the author");
assert.match(ownerWorkRoute, /targetUrl:\s*"\/me\?tab=works"/, "offline notification target must be an owner-visible page");

assert.match(incubationRoute, /NOTIFICATION_EVENTS\.INCUBATION_RECOMMENDED/, "new incubation recommendation should notify the work owner");
assert.match(incubationRoute, /!result\.alreadyRecommended/, "duplicate incubation recommendation records should not notify again");
assert.match(incubationRoute, /actorId:\s*user\.id/, "incubation recommendation must suppress self-notification");
assert.match(incubationRoute, /targetUrl:\s*"\/me\/incubation"/, "incubation recommendation target should be an owner-visible page");

assert.match(inquiryRoute, /NOTIFICATION_EVENTS\.INQUIRY_RECEIVED/, "new provider inquiry should notify the provider owner");
assert.match(repliesRoute, /NOTIFICATION_EVENTS\.INQUIRY_REPLIED/g, "inquiry replies should notify the opposite side");
assert.match(contactRoute, /NOTIFICATION_EVENTS\.REQUEST_HANDLED/, "contact authorization update should keep a safe request-handled notification");
assert.match(fabricRoute, /NOTIFICATION_EVENTS\.FABRIC_RECOMMENDED/, "fabric recommendation should notify the designer");
assert.match(proposalRoute, /NOTIFICATION_EVENTS\.PROVIDER_PROPOSAL_RECEIVED/, "provider work proposal should notify the designer");
assert.match(fabricStatusRoute, /NOTIFICATION_EVENTS\.PROVIDER_PROPOSAL_UPDATED/, "recommendation status changes should notify the provider");
assert.match(fabricHelper, /eventType = NOTIFICATION_EVENTS\.REQUEST_HANDLED/, "legacy notification helper should keep a safe default event");

assert.doesNotMatch(schemaSource, /parentId|replyToId|rootCommentId/, "current comment model should not be treated as threaded comments");
assert.doesNotMatch(notificationsLib, /COMMENT_REPLIED/, "COMMENT_REPLIED should not be faked without a stable reply relation");
assert.match(reportSource, /COMMENT_REPLIED[\s\S]*需要后续评论线程能力/, "report should explain why COMMENT_REPLIED is deferred");
assert.doesNotMatch(likeRoute, /NOTIFICATION_EVENTS\.WORK_LIKED|createNotificationSafe/, "WORK_LIKED must not be directly wired without stable aggregation");
assert.doesNotMatch(favoriteRoute, /NOTIFICATION_EVENTS\.WORK_FAVORITED|createNotificationSafe/, "WORK_FAVORITED must not be directly wired without stable aggregation");
assert.match(reportSource, /点赞、收藏不是代码遗漏/, "report should explain the like and favorite deferral");
assert.match(reportSource, /CHALLENGE_RESULT[\s\S]*后续事件/, "challenge result should be listed as a later event");

const directCreates = (notificationsLib.match(/prisma\.notification\.create/g) ?? []).length;
assert.equal(directCreates, 1, "notification writes should stay centralized in src/lib/notifications.ts");

console.log("notification event tests passed");
