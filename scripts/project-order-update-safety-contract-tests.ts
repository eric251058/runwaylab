import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/lib/projects/actions.ts", "utf8");
const start = source.indexOf("export async function updateProjectOrder");
assert(start >= 0, "updateProjectOrder must exist");
const action = source.slice(start);

const transaction = action.indexOf("await prisma.$transaction(async (tx) =>");
const read = action.indexOf("tx.projectOrder.findUnique");
const cas = action.indexOf("tx.projectOrder.updateMany");
const stateEvent = action.indexOf("tx.commerceStateEvent.create");
const adminLog = action.indexOf("tx.adminLog.create");

assert(transaction >= 0, "order update must use a transaction");
assert(read > transaction, "order must be read inside the transaction");
assert(cas > read, "compare-and-set update must follow the transactional read");
assert(stateEvent > cas, "state audit must only be appended after CAS succeeds");
assert(adminLog > cas, "admin audit must only be appended after CAS succeeds");
assert.doesNotMatch(action.slice(0, transaction), /prisma\.projectOrder\.findUnique/, "no stale order read may occur before the transaction");

assert.match(action, /for \(let attempt = 0; attempt < 3; attempt \+= 1\)/);
assert.match(action, /TransactionIsolationLevel\.Serializable/);
assert.match(action, /PrismaClientKnownRequestError/);
assert.match(action, /error\.code === "P2034"/);
assert.match(action, /attempt < 2\) continue/);

assert.match(action, /totalAmount: true/);
assert.match(action, /updatedAt: true/);
assert.match(action, /refunds:\s*\{\s*where: \{ status: CommerceRefundStatus\.SUCCEEDED \},\s*select: \{ amount: true \}/);
assert.match(action, /const succeededRefundAmount = order\.refunds\.reduce/);

assert.match(action, /const changingToPartiallyRefunded = paymentUpdate\.changed && paymentUpdate\.status === ProjectOrderPaymentStatus\.PARTIALLY_REFUNDED/);
assert.match(action, /const changingToFullyRefunded = paymentUpdate\.changed && paymentUpdate\.status === ProjectOrderPaymentStatus\.REFUNDED/);
assert.match(action, /const changingOrderToRefunded = effectiveStatus !== order\.status && effectiveStatus === ProjectOrderStatus\.REFUNDED/);
assert.match(action, /const enteringRefundPending = effectiveStatus === ProjectOrderStatus\.REFUND_PENDING/);
assert.match(action, /paymentUpdate\.status !== ProjectOrderPaymentStatus\.PAID[\s\S]*paymentUpdate\.status !== ProjectOrderPaymentStatus\.PARTIALLY_REFUNDED[\s\S]*!fullyRefundedWithEvidence/);
assert.match(action, /未付款的限量预售订单不能进入退款待处理/);
assert.match(action, /succeededRefundAmount <= 0/);
assert.match(action, /没有成功退款记录/);
assert.match(action, /succeededRefundAmount < order\.totalAmount/);
assert.match(action, /成功退款金额尚未覆盖订单总额/);

assert.match(action, /tx\.projectOrder\.updateMany\(\{\s*where:\s*\{\s*id,\s*updatedAt: order\.updatedAt,\s*status: order\.status,\s*paymentStatus: order\.paymentStatus,\s*fulfillmentStatus: order\.fulfillmentStatus/);
assert.match(action, /if \(changed\.count !== 1\) throw new Error\("订单状态已变化，请刷新后重试"\)/);
assert.doesNotMatch(action, /tx\.projectOrder\.update\(/, "unguarded order writes are forbidden");

// Existing manual-payment pilot, transition and reason controls remain in the transaction.
assert.match(action, /isFeatureEnabled\("feature\.manual_payment_pilot"\)/);
assert.match(action, /resolveManualPaymentStatusUpdate\(\{/);
assert.match(action, /manualPaymentPilotEnabled/);
assert.match(action, /if \(!paymentUpdate\.ok\) throw new Error\(paymentUpdate\.error\)/);
assert.match(action, /canTransitionOrderStatus/);
assert.match(action, /canTransitionFulfillmentStatus/);
assert.match(action, /oldPaymentStatus: order\.paymentStatus/);
assert.match(action, /newPaymentStatus: paymentUpdate\.status/);
assert.match(action, /reason: paymentReason/);
assert.match(action, /本批 V2\.3 仅验证真实订单意向/);
assert.match(action, /requestedPaymentStatus === ProjectOrderPaymentStatus\.PENDING \|\| requestedPaymentStatus === ProjectOrderPaymentStatus\.PAID/);
assert.match(action, /effectiveStatus === ProjectOrderStatus\.COMPLETED && fulfillmentStatus !== ProjectOrderFulfillmentStatus\.DELIVERED/);
assert.match(action, /oldFulfillmentStatus: order\.fulfillmentStatus/);
assert.match(action, /newFulfillmentStatus: fulfillmentStatus/);
assert.match(action, /effectiveStatus === ProjectOrderStatus\.CANCELLED && order\.status !== ProjectOrderStatus\.CANCELLED \? new Date\(\) : undefined/);

console.log("project order update safety contract tests: PASS");
