import assert from "node:assert/strict";
import { CollaborationProjectStatus, UserRole, UserStatus } from "@prisma/client";
import { readFileSync } from "node:fs";
import { canRequestProjectDesignAuthorization } from "../src/lib/projects/rules";

const project = {
  status: CollaborationProjectStatus.PLANNING,
  ownerUserId: "owner",
  createdById: "creator",
  designerId: null,
  work: { userId: "author" }
};

const user = (id: string, role: UserRole = UserRole.USER, status: UserStatus = UserStatus.ACTIVE) => ({ id, role, status });

assert.equal(canRequestProjectDesignAuthorization(user("owner"), project), true);
assert.equal(canRequestProjectDesignAuthorization(user("creator"), project), false);
assert.equal(canRequestProjectDesignAuthorization(user("creator"), { ...project, ownerUserId: null }), true);
assert.equal(canRequestProjectDesignAuthorization(user("author"), project), false);
assert.equal(canRequestProjectDesignAuthorization(user("admin", UserRole.ADMIN), project), false);
assert.equal(canRequestProjectDesignAuthorization(user("owner", UserRole.USER, UserStatus.BANNED), project), false);
assert.equal(canRequestProjectDesignAuthorization(user("author"), { ...project, ownerUserId: "author" }), true);

const actions = readFileSync("src/lib/projects/actions.ts", "utf8");
const policy = readFileSync("src/lib/projects/design-authorization-policy.ts", "utf8");
const authorizationsPage = readFileSync("src/app/me/authorizations/page.tsx", "utf8");
const adminPage = readFileSync("src/app/admin/projects/[id]/preorder/page.tsx", "utf8");
const schema = readFileSync("prisma/schema.prisma", "utf8");
const campaignBindingMigration = readFileSync("prisma/migrations/20260818090000_bind_design_authorization_campaign/migration.sql", "utf8");

const requestStart = actions.indexOf("export async function requestProjectDesignAuthorization");
const requestEnd = actions.indexOf("export async function respondProjectDesignAuthorization", requestStart);
assert(requestStart >= 0 && requestEnd > requestStart);
const request = actions.slice(requestStart, requestEnd);

assert.match(request, /canRequestProjectDesignAuthorization\(user, project\)/);
assert.match(request, /projectDesignAuthorizationPolicy\(project\.presaleCampaign\?\.id \?\? null\)/);
assert.match(request, /preorderCampaignId: policy\.preorderCampaignId/);
assert.match(request, /scope: policy\.scope/);
assert.match(request, /royaltyDescription: policy\.royaltyNotice/);
assert.match(request, /requestMode: "SELF_SERVICE_STANDARD"/);
assert.match(request, /recipientId: project\.work\.userId/);
assert.doesNotMatch(request, /formData\.get\("termsVersion"\)/);
assert.doesNotMatch(request, /formData\.get\("scope"\)/);
assert.doesNotMatch(request, /formData\.get\("royaltyDescription"\)/);
assert.match(request, /pendingRequiresStandardRefresh/);
assert.match(request, /existingAuthorization\.termsVersion !== policy\.termsVersion/);
assert.match(request, /existingAuthorization\.preorderCampaignId !== policy\.preorderCampaignId/);
assert.match(request, /existingAuthorization\.workId !== project\.workId/);
assert.match(request, /existingAuthorization\.designerUserId !== project\.work\.userId/);
assert.match(request, /existingAuthorization\.ownerUserId !== ownerUserId/);
assert.match(request, /existingAuthorization\?\.status === ProjectDesignAuthorizationStatus\.ACCEPTED[\s\S]*不能重新发起并覆盖该决定/);
assert.match(request, /existingAuthorization\?\.status === ProjectDesignAuthorizationStatus\.PENDING[\s\S]*&& !pendingRequiresStandardRefresh[\s\S]*标准授权邀请已经发送/);

assert.match(policy, /达到页面公示的成团目标且未取消/);
assert.match(policy, /按已审核商品与本期公示限量组织一次有限生产/);
assert.match(policy, /不转让著作权/);
assert.match(policy, /不允许超出本期限量、扩展到其他商品、进行平台外再授权或长期重复生产/);
assert.match(policy, /RunwayLab 不参与双方的分成或结算/);
assert.match(policy, /接受表示作者同意项目方在本期公示范围内按上述条件进行有限生产/);
assert.match(policy, /PROJECT_COLLABORATION_AUTHORIZATION_TERMS_VERSION/);
assert.match(policy, /不包含限量预售接单、量产/);
assert.match(policy, /projectDesignAuthorizationPolicy/);

assert.match(schema, /preorderCampaignId String\?/);
assert.match(schema, /PresaleCampaignDesignAuthorizations/);
assert.match(campaignBindingMigration, /ADD COLUMN "preorderCampaignId" TEXT/);
assert.match(campaignBindingMigration, /ON DELETE SET NULL ON UPDATE CASCADE/);
assert.doesNotMatch(campaignBindingMigration, /UPDATE "ProjectDesignAuthorization"/);

assert.match(authorizationsPage, /\{ ownerUserId: user\.id \}/);
assert.match(authorizationsPage, /\{ ownerUserId: null, createdById: user\.id \}/);
assert.match(authorizationsPage, /form action=\{requestProjectDesignAuthorization\}/);
assert.match(authorizationsPage, /邀请作者参与/);
assert.match(authorizationsPage, /pendingRequiresStandardRefresh/);
assert.match(authorizationsPage, /projectDesignAuthorizationPolicy/);
assert.match(authorizationsPage, /authorization\.preorderCampaignId !== policy\.preorderCampaignId/);
assert.match(authorizationsPage, /更新为标准邀请/);
assert.match(authorizationsPage, /等待作者决定/);
assert.match(authorizationsPage, /作者已同意/);
assert.match(authorizationsPage, /standardInvitationValid/);
assert.match(authorizationsPage, /旧版或项目负责人已变化的邀请，当前不能接受/);
assert.match(authorizationsPage, /respondProjectDesignAuthorization/);
assert.match(authorizationsPage, /revokeProjectDesignAuthorization/);

assert.doesNotMatch(adminPage, /requestProjectDesignAuthorization/);
assert.doesNotMatch(adminPage, /name="termsVersion"/);
assert.doesNotMatch(adminPage, /name="scope"/);
assert.match(adminPage, /平台不代替双方作商业决定/);
assert.match(adminPage, /前往授权中心/);

console.log("self-service design authorization tests: PASS");
