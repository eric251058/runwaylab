import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync("src/lib/commercial-collaboration-actions.ts", "utf8");
const presaleActions = readFileSync("src/lib/presale-campaign-actions.ts", "utf8");

const lockedStatuses = actions.match(
  /const LOCKED_LIMITED_PREORDER_STATUSES:[\s\S]*?= \[([\s\S]*?)\];/
)?.[1] ?? "";

for (const status of ["OPEN", "PAUSED", "GOAL_REACHED", "FAILED", "PRODUCTION", "CANCELLED"]) {
  assert.match(lockedStatuses, new RegExp(`LimitedPreorderStatus\\.${status}`), `${status} must lock live V2.3 data`);
}
assert.doesNotMatch(lockedStatuses, /LimitedPreorderStatus\.NOT_STARTED/, "preparation must remain editable");
assert.doesNotMatch(lockedStatuses, /LimitedPreorderStatus\.CLOSED/, "closed campaigns must release legacy editing");

assert.match(actions, /function isConfiguredLimitedPreorder\(/);
assert.match(actions, /campaign\?\.preorderStatus !== LimitedPreorderStatus\.CLOSED/);
assert.match(actions, /isManagedLimitedPreorder\(existingProject\?\.presaleCampaign\)/);
assert.match(actions, /status === ProjectProductStatus\.PREORDER_OPEN && isManagedLimitedPreorder\(project\.presaleCampaign\)/);
assert.doesNotMatch(
  actions,
  /if \(status === ProjectProductStatus\.PREORDER_OPEN\) throw/,
  "legacy products without a managed V2.3 campaign must retain their previous status flow"
);

assert.match(actions, /data\.presaleCampaignId !== existingProject\.presaleCampaignId/);
assert.match(actions, /const campaignAssociationChanged = data\.presaleCampaignId !== \(existingProject\?\.presaleCampaignId \?\? null\)/);
assert.match(actions, /existingProject\?\.presaleCampaign\?\.preorderStatus === LimitedPreorderStatus\.CLOSED/);
assert.match(actions, /通用项目入口不可挂接或更换活动/);
assert.match(actions, /data\.workId !== existingProject\.workId/);
assert.match(actions, /data\.designerId !== existingProject\.designerId/);
assert.match(actions, /designAuthorizations: \{[\s\S]*status: true, workId: true, designerUserId: true/);
assert.match(actions, /data\.workId !== existingProject\.workId[\s\S]*existingProject\.designerAuthorizationStatus === ProjectDesignAuthorizationStatus\.ACCEPTED/);
assert.match(actions, /authorizationRecord[\s\S]*ProjectDesignAuthorizationStatus\.PENDING, ProjectDesignAuthorizationStatus\.ACCEPTED[\s\S]*authorizationRecord\.status/);
assert.doesNotMatch(
  actions,
  /\[ProjectDesignAuthorizationStatus\.PENDING, ProjectDesignAuthorizationStatus\.ACCEPTED\][\s\S]*\.includes\(existingProject\.designerAuthorizationStatus\)/,
  "a project's default redundant PENDING value must not block changing work when no authorization record exists"
);
assert.match(actions, /项目已有待确认或已接受的设计授权，不能更换作品/);
assert.match(actions, /const pausedAuthorizationRecovery =/);
assert.match(actions, /preorderStatus === LimitedPreorderStatus\.PAUSED/);
assert.match(actions, /data\.status === CollaborationProjectStatus\.PREORDER_READY/);
assert.match(actions, /designerAuthorizationStatus === ProjectDesignAuthorizationStatus\.ACCEPTED/);
assert.match(actions, /collaborationProject\.updateMany\([\s\S]*presaleCampaignId: existingProject\.presaleCampaignId[\s\S]*status: existingProject\.status/);
assert.match(actions, /designerAuthorizationStatus: existingProject\.designerAuthorizationStatus/);
assert.match(actions, /项目状态或关键关联已变化，请刷新后重试/);

assert.match(actions, /async function runPreorderPreparationTransaction/);
assert.match(actions, /TransactionIsolationLevel\.Serializable/);
assert.match(actions, /error\.code === "P2034" && attempt < 2/);
assert.equal(
  actions.match(/await runPreorderPreparationTransaction\(async \(tx\) =>/g)?.length,
  2,
  "product and SKU saves must share the serializable retry wrapper"
);

const productAction = actions.slice(
  actions.indexOf("export async function saveProjectProduct"),
  actions.indexOf("export async function saveProjectSku")
);
assert.match(productAction, /tx\.collaborationProject\.findUnique/);
assert.match(productAction, /tx\.projectProduct\.findUnique/);
assert.match(productAction, /tx\.projectProduct\.updateMany/);
assert.match(productAction, /preorderCampaignId: existing\.preorderCampaignId/);
assert.match(productAction, /status: existing\.status/);
assert.match(productAction, /updatedAt: existing\.updatedAt/);
assert.match(productAction, /商品状态或活动归属已变化，请刷新后重试/);

const skuAction = actions.slice(
  actions.indexOf("export async function saveProjectSku"),
  actions.indexOf("export async function saveProjectOrder")
);
assert.match(skuAction, /tx\.projectProduct\.findUnique/);
assert.match(skuAction, /isLimitedPreorderLifecycleLocked\(product\.preorderCampaign\)/);
assert.match(skuAction, /tx\.projectSku\.findUnique/);
assert.match(skuAction, /tx\.projectSku\.updateMany/);
assert.match(skuAction, /updatedAt: existing\.updatedAt/);
assert.match(skuAction, /product: \{[\s\S]*?is: \{[\s\S]*?status: product\.status[\s\S]*?preorderCampaignId: product\.preorderCampaignId[\s\S]*?updatedAt: product\.updatedAt/);
assert.match(skuAction, /SKU 状态或商品归属已变化，请刷新后重试/);
assert.match(skuAction, /priceOverride: integerValue\([\s\S]*?\{ min: 1, max: 100_000_000 \}/);
assert.doesNotMatch(skuAction, /priceOverride: integerValue\([\s\S]*?\{ min: 0,/);

const legacyOrderAction = actions.slice(actions.indexOf("export async function saveProjectOrder"));
const orderLookupIndex = legacyOrderAction.indexOf("prisma.projectOrder.findUnique");
const orderUpdateIndex = legacyOrderAction.indexOf("prisma.projectOrder.update");
assert(orderLookupIndex >= 0 && orderLookupIndex < orderUpdateIndex, "legacy order must be classified before update");
assert.match(legacyOrderAction, /select: \{ projectId: true, preorderCampaignId: true \}/);
assert.match(legacyOrderAction, /if \(existing\.preorderCampaignId\)/);
assert.match(legacyOrderAction, /V2\.3 限量预售订单必须通过订单管理页处理/);
assert.match(legacyOrderAction, /if \(existing\.projectId !== data\.projectId\)/);
assert.match(legacyOrderAction, /项目意向不能更换所属合作项目/);

assert.match(presaleActions, /runPresaleCampaignSaveTransaction/);
assert.match(presaleActions, /designAuthorizations: \{[\s\S]*status: true, workId: true, designerUserId: true/);
assert.match(presaleActions, /authorization\.workId !== data\.workId/);
assert.match(presaleActions, /authorization\.designerUserId !== selectedProject\.work\?\.userId/);
assert.match(presaleActions, /data\.status === PresaleCampaignStatus\.ACTIVE[\s\S]*!isPublicQualityWork\(selectedProject\.work\)/);

console.log("limited preorder legacy isolation contract tests: PASS");
