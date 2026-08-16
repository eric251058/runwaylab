import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/admin/presale-campaigns/page.tsx", "utf8");

assert.match(page, /PresaleCampaignIntentStatus\.CONFIRMED/);
assert.match(page, /confirmedQuantity/);
assert.match(page, /confirmationRate/);
assert.match(page, /targetReached/);
assert.match(page, /打开承接项目/);
assert.match(page, /不会自动创建订单、生产任务或收入记录/);
assert.match(page, /select: \{ status: true, quantity: true \}/);

console.log("presale-decision-panel-tests: PASS");
