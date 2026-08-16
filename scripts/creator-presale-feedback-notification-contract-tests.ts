import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync("src/lib/presale-campaign-actions.ts", "utf8");

assert.match(actions, /title: true,[\s\S]*work: \{ select: \{ userId: true \} \}/);
assert.match(actions, /recipientId: campaign\.work\.userId/);
assert.match(actions, /title: "作品收到新的预售意向"/);
assert.match(actions, /不是订单或已付款交易/);
assert.match(actions, /recipientId: intent\.work\.userId/);
assert.match(actions, /title: "作品预售意向已撤回"/);
assert.match(actions, /不是退款或订单取消/);
assert.equal((actions.match(/targetUrl: "\/me\/incubation"/g) ?? []).length >= 2, true);
assert.match(actions, /createNotificationSafe\(\{[\s\S]*recipientId: campaign\.work\.userId[\s\S]*dedupe: false/);
assert.match(actions, /createNotificationSafe\(\{[\s\S]*recipientId: intent\.work\.userId[\s\S]*dedupe: false/);

console.log("creator-presale-feedback-notification-contract-tests: PASS");
