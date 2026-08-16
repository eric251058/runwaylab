import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const projectDetail = readFileSync("src/app/projects/[id]/page.tsx", "utf8");
const projectMarket = readFileSync("src/app/projects/page.tsx", "utf8");
const meProjectOrders = readFileSync("src/app/me/project-orders/page.tsx", "utf8");
const adminProjectOrders = readFileSync("src/app/admin/project-orders/page.tsx", "utf8");
const meOrders = readFileSync("src/app/me/orders/page.tsx", "utf8");
const meOrderDetail = readFileSync("src/app/me/orders/[id]/page.tsx", "utf8");
const adminOrders = readFileSync("src/app/admin/orders/page.tsx", "utf8");

// V2.2 collaboration intents remain separate from V2.3 transactional preorder orders.
assert.match(projectDetail, /orders: \{ where: \{ preorderCampaignId: null \}/);
assert.match(projectMarket, /orders: \{ where: \{ preorderCampaignId: null \} \}/);
assert.match(meProjectOrders, /\{ preorderCampaignId: null \}/);
assert.match(adminProjectOrders, /findMany\(\{ where: \{ preorderCampaignId: null \}/);

// V2.3 buyer/admin order surfaces never duplicate legacy collaboration intents.
assert.match(meOrders, /preorderCampaignId: \{ not: null \}/);
assert.match(meOrderDetail, /preorderCampaignId: \{ not: null \}/);
assert.match(adminOrders, /preorderCampaignId: \{ not: null \}/);

console.log("limited preorder query isolation contract tests: PASS");
