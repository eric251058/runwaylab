import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync("src/lib/projects/actions.ts", "utf8");
const adminPage = readFileSync("src/app/admin/projects/[id]/preorder/page.tsx", "utf8");
const designerPage = readFileSync("src/app/me/authorizations/page.tsx", "utf8");

assert.match(actions, /export async function requestProjectDesignAuthorization/);
assert.match(actions, /export async function respondProjectDesignAuthorization/);
assert.match(actions, /export async function revokeProjectDesignAuthorization/);
assert.match(actions, /if \(!canDesignerRespondToAuthorization/);
assert.match(actions, /只有作品作者本人可以撤销设计授权/);
assert.match(actions, /ProjectDesignAuthorizationStatus.REVOKED/);

assert.doesNotMatch(adminPage, /requestProjectDesignAuthorization/);
assert.match(adminPage, /disabled={preparationLocked}/);
assert.match(adminPage, /平台不能代替双方决定/);
assert.match(adminPage, /等待作者接受当前最终版本/);

assert.match(designerPage, /requestProjectDesignAuthorization/);
assert.match(designerPage, /我发起的授权邀请/);
assert.match(designerPage, /需要我决定的邀请/);
assert.match(designerPage, /respondProjectDesignAuthorization/);
assert.match(designerPage, /revokeProjectDesignAuthorization/);
assert.match(designerPage, /接受授权/);
assert.match(designerPage, /拒绝授权/);
assert.match(designerPage, /撤销授权/);
assert.match(designerPage, /不会自动创建订单、扣款、生产任务或收入/);
assert.match(designerPage, /const revocationLocked = [\s\S]*GOAL_REACHED[\s\S]*PRODUCTION/);
assert.match(designerPage, /authorization\.status === ProjectDesignAuthorizationStatus\.ACCEPTED && !revocationLocked/);
assert.match(designerPage, /authorization\.status === ProjectDesignAuthorizationStatus\.ACCEPTED && revocationLocked/);
assert.match(designerPage, /活动已经成团或进入生产，不能单方面撤销授权/);
assert.match(designerPage, /项目异常、取消与退款流程/);
assert.match(designerPage, /成团前可以撤销/);

console.log("Designer authorization UI contract: PASS");
