import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync("src/lib/projects/actions.ts", "utf8");
const mePage = readFileSync("src/app/me/page.tsx", "utf8");
const authorizationPage = readFileSync("src/app/me/authorizations/page.tsx", "utf8");

assert.ok(actions.includes("createNotificationSafe"));
assert.ok(actions.includes("recipientId: project.work.userId"));
assert.ok(actions.includes("actorId: user.id"));
assert.ok(actions.includes('title: "新的设计授权请求"'));
assert.ok(actions.includes('targetUrl: "/me/authorizations"'));
assert.ok(actions.includes("dedupe: true"));

assert.ok(mePage.includes("projectDesignAuthorization.count"));
assert.ok(mePage.includes("designerUserId: user.id"));
assert.ok(mePage.includes('status: "PENDING"'));
assert.ok(mePage.includes('["设计授权"'));
assert.ok(mePage.includes('"/me/authorizations"'));

assert.ok(authorizationPage.includes("项目方可以发起合作请求，但不能代替你同意"));
console.log("Authorization discovery contract: PASS");
