import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const showcasePage = readFileSync("src/app/providers/[id]/showcase/[itemId]/page.tsx", "utf8");

assert.match(showcasePage, /isProviderOwner/, "showcase page should use real provider ownership");
assert.match(showcasePage, /编辑案例/, "owner should see edit showcase action");
assert.match(showcasePage, /返回案例管理/, "owner should return to showcase management");
assert.match(showcasePage, /查看收到的询盘/, "owner should see inquiry management");
assert.match(showcasePage, /!isOwner \?/, "visitor inquiry module must be hidden from owner");
assert.match(showcasePage, /发送站内询盘/, "visitor should see one station inquiry action");
assert.match(showcasePage, /后台管理此服务商/, "admin should get a backend management entry");
assert.doesNotMatch(showcasePage, /providerBelongsToUser/, "showcase page should not use admin-as-owner helper");
assert.doesNotMatch(showcasePage, /contactEmail|contactPhone|wechat|whatsapp/, "showcase page should not render provider private contacts");

console.log("provider showcase context tests passed");
