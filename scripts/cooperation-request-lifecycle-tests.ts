import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RequestStatus } from "@prisma/client";
import { canProviderTransitionInquiry, canWithdrawInquiry, isTerminalInquiryStatus } from "../src/lib/content-lifecycle";

assert.equal(canWithdrawInquiry({ status: RequestStatus.PENDING, replies: [] }), true);
assert.equal(canWithdrawInquiry({ status: RequestStatus.PENDING, replies: [{}] }), false);
assert.equal(canWithdrawInquiry({ status: RequestStatus.QUOTED, replies: [] }), false);
assert.equal(isTerminalInquiryStatus(RequestStatus.CLOSED), true);
assert.equal(isTerminalInquiryStatus(RequestStatus.COMPLETED), true);
assert.equal(canProviderTransitionInquiry(RequestStatus.PENDING, RequestStatus.CONTACTED), true);
assert.equal(canProviderTransitionInquiry(RequestStatus.PENDING, RequestStatus.COMPLETED), true);
assert.equal(canProviderTransitionInquiry(RequestStatus.CLOSED, RequestStatus.PENDING), false);
assert.equal(canProviderTransitionInquiry(RequestStatus.COMPLETED, RequestStatus.CONTACTED), false);

const providerActionsSource = readFileSync("src/lib/provider-center-actions.ts", "utf8");
const designerActionsSource = readFileSync("src/lib/inquiry-lifecycle-actions.ts", "utf8");
const repliesSource = readFileSync("src/app/api/cooperation-requests/[id]/replies/route.ts", "utf8");
const providerPageSource = readFileSync("src/app/provider-center/inquiries/page.tsx", "utf8");
const mePageSource = readFileSync("src/app/me/inquiries/page.tsx", "utf8");

assert.match(providerActionsSource, /canProviderTransitionInquiry/, "provider status changes should be server guarded");
assert.match(designerActionsSource, /canWithdrawInquiry/, "designer withdraw should require pending and no replies");
assert.match(repliesSource, /RequestStatus\.CLOSED/, "closed inquiries should reject replies");
assert.match(repliesSource, /RequestStatus\.COMPLETED/, "completed inquiries should reject replies");
assert.match(providerPageSource, /关闭询盘/, "provider close action should be explicit");
assert.match(providerPageSource, /完成合作/, "provider complete action should be explicit");
assert.match(mePageSource, /撤回询盘/, "designer should be able to withdraw untouched pending inquiry");

console.log("cooperation request lifecycle tests passed");
