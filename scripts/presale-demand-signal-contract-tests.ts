import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const incubation = readFileSync("src/app/me/incubation/page.tsx", "utf8");
const presale = readFileSync("src/app/presale/page.tsx", "utf8");
const panel = readFileSync("src/components/presale/PresaleCampaignPanel.tsx", "utf8");

assert.match(incubation, /intents: \{[\s\S]*select: \{[\s\S]*status: true,[\s\S]*size: true,[\s\S]*color: true,[\s\S]*quantity: true,[\s\S]*createdAt: true/);
assert.match(incubation, /最近市场信号（不展示购买者联系方式）/);
assert.match(incubation, /PRESALE_INTENT_STATUS_LABELS\[intent\.status\]/);
assert.match(incubation, /以上仅为市场购买意向，不代表订单或已付款交易/);
assert.doesNotMatch(presale, /currentCount\} 人/);
assert.doesNotMatch(panel, /currentCount\} 人表达意向/);
assert.match(presale, /currentCount\} 件购买意向，目标 \{campaign\.targetCount\} 件/);
assert.match(panel, /currentCount\} 件购买意向，目标 \{campaign\.targetCount\} 件/);

console.log("presale-demand-signal-contract-tests: PASS");
