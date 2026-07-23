import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const providerPage = readFileSync("src/app/providers/[id]/page.tsx", "utf8");
const providerProfilePage = readFileSync("src/app/provider-center/profile/page.tsx", "utf8");
const adminProvidersPage = readFileSync("src/app/admin/providers/page.tsx", "utf8");
const inquiryRoute = readFileSync("src/app/api/cooperation-requests/route.ts", "utf8");
const contactRoute = readFileSync("src/app/api/cooperation-requests/[id]/contact/route.ts", "utf8");
const repliesRoute = readFileSync("src/app/api/cooperation-requests/[id]/replies/route.ts", "utf8");

assert.doesNotMatch(providerPage, /provider\.contactEmail|provider\.contactPhone|provider\.wechat|provider\.whatsapp/, "visitor HTML must not render full provider contacts");
assert.doesNotMatch(providerPage, /邮箱：|电话：|微信：|WhatsApp：/, "public provider page should not display direct contact labels");
assert.match(providerPage, /联系方式默认不会公开/, "public page should explain station-first privacy");

assert.match(providerProfilePage, /name="contactPhone"/, "owner profile should still edit full phone");
assert.match(providerProfilePage, /name="contactEmail"/, "owner profile should still edit full email");
assert.match(providerProfilePage, /name="wechat"/, "owner profile should still edit full wechat");
assert.match(providerProfilePage, /允许登录用户发起站内联系/, "provider center should use station-contact wording");
assert.doesNotMatch(providerProfilePage, /登录用户可见联系方式/, "provider center should not promise public contact visibility");

assert.match(adminProvidersPage, /允许登录用户发起站内联系/, "admin provider page should use station-contact wording");
assert.doesNotMatch(adminProvidersPage, /公开联系方式/, "admin provider page should not use direct public contact wording");
assert.match(adminProvidersPage, /完整联系方式仅在后台和授权询盘上下文查看/, "admin page should explain where full contacts are visible");

assert.match(inquiryRoute, /contactPreference[\s\S]*SITE_ONLY/, "provider inquiry should default to site-only contact");
assert.match(contactRoute, /inquiry\.userId !== user\.id/, "only inquiry owner can authorize contact sharing");
assert.match(repliesRoute, /inquiry\.userId === user\.id/, "inquiry owner can read replies");
assert.match(repliesRoute, /providerBelongsToUser/, "provider owner can read replies");

console.log("provider contact privacy tests passed");
