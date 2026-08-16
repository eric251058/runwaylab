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

assert.match(adminPage, /requestProjectDesignAuthorization/);
assert.match(adminPage, /disabled={!authorizationReady}/);
assert.match(adminPage, /项目方可以发起请求，但不能代替作品作者同意/);
assert.match(adminPage, /等待设计师授权/);

assert.match(designerPage, /respondProjectDesignAuthorization/);
assert.match(designerPage, /revokeProjectDesignAuthorization/);
assert.match(designerPage, /接受授权/);
assert.match(designerPage, /拒绝授权/);
assert.match(designerPage, /撤销授权/);
assert.match(designerPage, /不会自动创建订单、扣款、生产任务或收入/);

console.log("Designer authorization UI contract: PASS");
