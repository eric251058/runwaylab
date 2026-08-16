import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panel = readFileSync("src/components/projects/LimitedPreorderPanel.tsx", "utf8");
const projectPage = readFileSync("src/app/projects/[id]/page.tsx", "utf8");
const orderList = readFileSync("src/app/me/orders/page.tsx", "utf8");
const orderDetail = readFileSync("src/app/me/orders/[id]/page.tsx", "utf8");
const adminOrders = readFileSync("src/app/admin/orders/page.tsx", "utf8");
const preorderService = readFileSync("src/lib/projects/preorder-service.ts", "utf8");

// The consumer sees the product and delivery facts that admission requires.
for (const field of ["description", "materialDescription", "careInstructions", "preorderLimit", "estimatedShipDate"]) {
  assert.match(panel, new RegExp(field), `consumer panel does not render ${field}`);
  assert.match(projectPage, new RegExp(field), `project page does not map ${field}`);
}

// Consent is attached to visible versioned terms text, not a version label alone.
assert.match(panel, /限量预售条款正文/);
assert.match(panel, /campaign\.termsText/);
assert.match(panel, /我已完整阅读并同意以上 \{campaign\.termsVersion\} 条款正文/);
assert.match(projectPage, /termsText: presaleCampaign!\.preorderTermsText/);

// Paid-order pilots disclose manual confirmation and surface the exact returned expiry.
assert.match(panel, /当前为人工付款确认试点，不会在提交时自动扣款/);
assert.match(panel, /campaign\.paymentInstructions/);
assert.match(projectPage, /paymentInstructions: presaleCampaign!\.preorderPaymentInstructions/);
assert.match(panel, /reservationExpiresAt/);
assert.match(panel, /名额锁定至 \$\{formatDateTime\(data\.order\.reservationExpiresAt\)\}/);

// A kill switch prevents new submissions but must not hide existing obligations.
assert.doesNotMatch(orderList, /const orders = enabled\s*\?/);
assert.match(orderList, /历史订单、付款、退款和履约记录仍会继续展示/);
assert.doesNotMatch(orderDetail, /if \(!enabled\) notFound\(\)/);
assert.match(orderDetail, /这笔历史订单及其付款、退款和履约义务仍然有效/);
assert.match(orderDetail, /termsTextSnapshot/);
assert.match(orderDetail, /paymentInstructionsSnapshot/);
assert.match(orderDetail, /cancellationReason/);

// Once V2.3 starts, every lifecycle state remains visible on the public project
// and the buyer's order detail, even when no new submission form is available.
assert.match(projectPage, /preorderLifecycleStarted/);
assert.match(projectPage, /LIMITED_PREORDER_STATUS_LABELS\[presaleCampaign\.preorderStatus\]/);
assert.match(projectPage, /LIMITED_PREORDER_QUALIFICATION_LABELS\[presaleCampaign\.preorderQualificationMode\]/);
assert.match(projectPage, /presaleCampaign\.preorderPublicNotice/);
assert.doesNotMatch(projectPage, /presaleCampaign\.preorderDecisionReason/);
assert.match(projectPage, /presaleCampaign\.preorderDeadline > new Date\(\)/);
assert.match(projectPage, /本期预售已截止，正在等待平台按真实订单意向结算/);
for (const status of ["PAUSED", "GOAL_REACHED", "FAILED", "CANCELLED", "PRODUCTION", "CLOSED"]) {
  assert.match(projectPage, new RegExp(`LimitedPreorderStatus\\.${status}`), `public project is missing ${status} lifecycle copy`);
  assert.match(orderDetail, new RegExp(`LimitedPreorderStatus\\.${status}`), `order detail is missing ${status} lifecycle copy`);
}
assert.match(projectPage, /已付款订单进入退款待处理/);
assert.match(projectPage, /本期已进入生产/);
assert.match(orderDetail, /preorderCampaign:\s*\{/);
assert.match(orderDetail, /LIMITED_PREORDER_STATUS_LABELS\[order\.preorderCampaign\.preorderStatus\]/);
assert.match(orderDetail, /order\.preorderCampaign\.preorderPublicNotice/);
assert.doesNotMatch(orderDetail, /order\.preorderCampaign\.preorderDecisionReason/);
assert.match(orderDetail, /readProjectOrderProductSnapshot\(order\.productSnapshot\)/);
assert.match(orderDetail, /readProjectOrderSkuSnapshot\(order\.skuSnapshot\)/);
assert.match(orderList, /readProjectOrderProductSnapshot\(order\.productSnapshot\)/);
assert.match(adminOrders, /readProjectOrderProductSnapshot\(order\.productSnapshot\)/);

// Duplicate-order guidance must not promise a self-service edit/cancel flow that does not exist.
assert.match(preorderService, /当前没有自助修改入口，请联系 RunwayLab 平台或管理员核对并处理原记录/);
assert.doesNotMatch(preorderService, /请先在订单中心处理原记录/);

// The admin UI must not call a buyer-visible field an internal note.
assert.match(adminOrders, /用户可见说明（会显示在订单详情）/);

console.log("limited preorder consumer transparency tests: PASS");
