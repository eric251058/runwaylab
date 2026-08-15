import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const projectPage = readFileSync("src/app/projects/[id]/page.tsx", "utf8");

assert.match(projectPage, /PresaleCampaignIntentStatus/);
assert.match(projectPage, /status: true/);
assert.match(projectPage, /quantity: true/);
assert.match(projectPage, /confirmedQuantity/);
assert.match(projectPage, /Math\.min\(100/);
assert.match(projectPage, /有效意向数量/);
assert.match(projectPage, /已人工确认/);
assert.match(projectPage, /不代表已成交订单或平台收入/);

console.log("project-demand-signal-tests: PASS");
