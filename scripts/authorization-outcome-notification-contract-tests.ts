import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync("src/lib/projects/actions.ts", "utf8");

assert.ok(actions.includes("recipientId: authorization.ownerUserId"));
assert.ok(actions.includes('title: status === ProjectDesignAuthorizationStatus.ACCEPTED ? "设计授权已接受" : "设计授权未接受"'));
assert.ok(actions.includes("作品作者已接受本次设计授权"));
assert.ok(actions.includes("作品作者未接受本次设计授权"));
assert.ok(actions.includes('title: "设计授权已撤销"'));
assert.ok(actions.includes("限量预售相关项目阶段已回到规划状态"));
assert.ok(actions.includes("原有项目业务阶段保持不变"));
assert.ok(actions.includes('targetUrl: "/me/projects/" + projectId'));
assert.ok(actions.includes("dedupe: true"));
assert.ok(actions.includes("createNotificationSafe"));

console.log("Authorization outcome notification contract: PASS");
