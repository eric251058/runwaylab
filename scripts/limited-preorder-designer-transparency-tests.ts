import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/me/authorizations/page.tsx", "utf8");

assert.match(page, /where: \{ designerUserId: user\.id \}/, "designer view must remain scoped to the signed-in author");
assert.match(page, /preorderStatus: true/);
assert.match(page, /preorderQualificationMode: true/);
assert.match(page, /preorderTargetQuantity: true/);
assert.match(page, /preorderCapacity: true/);
assert.match(page, /preorderDeadline: true/);
assert.match(page, /preorderPublicNotice: true/);
assert.match(page, /preorderOrders: \{[\s\S]*quantity: true, status: true, paymentStatus: true, fulfillmentStatus: true/);
assert.match(page, /summarizeLimitedPreorderOrders/);
assert.match(page, /当前合格件数/);
assert.match(page, /本期限量/);
assert.match(page, /预售不等于现货/);
assert.match(page, /不展示买家身份、联系方式或订单私密信息/);
assert.doesNotMatch(page, /preorderOrders:[\s\S]*buyer:\s*true/, "designer aggregate must not load buyer records");
assert.doesNotMatch(page, /preorderOrders:[\s\S]*buyerId:\s*true/, "designer aggregate must not load buyer ids");

console.log("limited preorder designer transparency tests: PASS");
