import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const providerPage = readFileSync("src/app/providers/[id]/page.tsx", "utf8");
const supplyNetwork = readFileSync("src/lib/supply-network.ts", "utf8");
const providerAccess = readFileSync("src/lib/provider-access.ts", "utf8");
const inquiryRoute = readFileSync("src/app/api/cooperation-requests/route.ts", "utf8");

assert.match(providerPage, /isProviderOwner/, "provider public page must use real provider owner checks");
assert.match(providerPage, /showOwnerControls/, "owner controls should be a separate page branch");
assert.match(providerPage, /编辑服务商主页/, "owner should see profile editing as the primary action");
assert.match(providerPage, /管理面料产品/, "owner should see product management");
assert.match(providerPage, /查看收到的询盘/, "owner should see inquiry management");
assert.match(providerPage, /预览访客视角/, "owner should be able to preview visitor view");
assert.match(providerPage, /preview[\s\S]*visitor|visitor[\s\S]*preview/, "visitor preview should be query-controlled");
assert.match(providerPage, /预览模式下不能向自己发送询盘/, "preview mode must not submit self-inquiries");
assert.match(providerPage, /后台管理此服务商/, "admin should get a small admin management entry");
assert.doesNotMatch(providerPage, /contactVisible/, "public page should not use contactVisible to expose private contacts");
assert.doesNotMatch(providerPage, /provider\.contactEmail|provider\.contactPhone|provider\.wechat|provider\.whatsapp/, "public provider page must not render full contact fields");

assert.match(supplyNetwork, /export function isProviderOwner/, "supply network should expose a real owner helper");
assert.match(supplyNetwork, /Legacy fallback/, "legacy email fallback should be documented");
assert.doesNotMatch(supplyNetwork, /user\.role === UserRole\.ADMIN\)\s*return true/, "admin must not automatically belong to every provider");
assert.doesNotMatch(providerAccess, /user\.role === UserRole\.ADMIN[\s\S]*updatedAt/, "admin must not get an arbitrary provider-center context");

assert.match(inquiryRoute, /providerBelongsToUser/, "API must still prevent self-inquiry");
assert.match(inquiryRoute, /publicContactEnabled/, "API should respect the station-contact switch");
assert.match(inquiryRoute, /不能给自己的服务商主页发送询盘/, "self-inquiry must still return a clear 403 message");

console.log("provider public context tests passed");
