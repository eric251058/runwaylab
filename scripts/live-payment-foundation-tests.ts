import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";

import { alipayAmountToCents, amountCentsToAlipayAmount } from "@/lib/payments/alipay";
import { createPaymentOperationsProvider, createPaymentProvider } from "@/lib/payments/provider";

async function main() {
assert.equal(amountCentsToAlipayAmount(1), "0.01");
assert.equal(amountCentsToAlipayAmount(19_900), "199.00");
assert.equal(alipayAmountToCents("199.00"), 19_900);
assert.equal(alipayAmountToCents("0.01"), 1);
assert.throws(() => amountCentsToAlipayAmount(0), /INVALID_AMOUNT_CENTS/);
assert.throws(() => amountCentsToAlipayAmount(1.5), /INVALID_AMOUNT_CENTS/);
assert.throws(() => alipayAmountToCents("1.001"), /INVALID_ALIPAY_AMOUNT/);

const merchantKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const alipayKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const merchantPrivateKey = merchantKeys.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const alipayPrivateKey = alipayKeys.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const alipayPublicKey = alipayKeys.publicKey.export({ type: "spki", format: "pem" }).toString();
const liveFlags = { "feature.live_payment": true, "feature.manual_payment_pilot": true } as const;
const configuredEnv = {
  NODE_ENV: "production" as const,
  PAYMENT_PROVIDER: "alipay",
  PAYMENT_LIVE_ACK: "RUNWAYLAB_LIVE_PAYMENT_APPROVED",
  ALIPAY_APP_ID: "2026000000000000",
  ALIPAY_PRIVATE_KEY: merchantPrivateKey,
  ALIPAY_PUBLIC_KEY: alipayPublicKey,
  ALIPAY_SELLER_ID: "2088000000000000",
  ALIPAY_GATEWAY: "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
};

assert.equal(createPaymentProvider(liveFlags, "production", { ...configuredEnv, PAYMENT_LIVE_ACK: "" }).configured, false);
assert.equal(createPaymentProvider({ "feature.live_payment": true }, "production", configuredEnv).configured, false);
assert.equal(createPaymentProvider(liveFlags, "production", { ...configuredEnv, ALIPAY_SELLER_ID: "" }).configured, false);
assert.equal(createPaymentProvider(liveFlags, "production", { ...configuredEnv, ALIPAY_GATEWAY: "https://example.com/gateway.do" }).configured, false);
assert.equal(createPaymentOperationsProvider("production", configuredEnv).configured, true);

const provider = createPaymentProvider(liveFlags, "production", configuredEnv);
assert.equal(provider.configured, true);
assert.equal(provider.name, "alipay");
const checkout = await provider.createPayment({
  orderId: "order_test_1",
  attemptId: "attempt_test_1",
  amountCents: 19_900,
  currency: "CNY",
  description: "RunwayLab 支付测试",
  returnUrl: "https://fashionstyleai.com/me/orders/order_test_1",
  notifyUrl: "https://fashionstyleai.com/api/payments/alipay/notify"
});
assert.equal(checkout.ok, true);
if (!checkout.ok) throw new Error("checkout generation failed");
const checkoutUrl = new URL(checkout.paymentUrl);
assert.equal(checkoutUrl.origin + checkoutUrl.pathname, configuredEnv.ALIPAY_GATEWAY);
assert.equal(checkoutUrl.searchParams.get("method"), "alipay.trade.page.pay");
assert.match(checkoutUrl.searchParams.get("biz_content") ?? "", /attempt_test_1/);
assert.ok(checkoutUrl.searchParams.get("sign"));

const notificationPayload: Record<string, string> = {
  app_id: configuredEnv.ALIPAY_APP_ID,
  seller_id: configuredEnv.ALIPAY_SELLER_ID,
  notify_id: "notify_test_1",
  out_trade_no: "attempt_test_1",
  trade_no: "2026082900000001",
  total_amount: "199.00",
  trade_status: "TRADE_SUCCESS",
  gmt_payment: "2026-08-29 14:00:00",
  charset: "utf-8",
  sign_type: "RSA2"
};
const signContent = Object.keys(notificationPayload)
  .sort()
  .map((key) => `${key}=${notificationPayload[key]}`)
  .join("&");
const signer = createSign("RSA-SHA256");
signer.update(signContent, "utf8");
signer.end();
notificationPayload.sign = signer.sign(alipayPrivateKey, "base64");

const verified = provider.verifyNotification(notificationPayload);
assert.equal(verified.ok, true);
if (!verified.ok) throw new Error("notification verification failed");
assert.equal(verified.amountCents, 19_900);
assert.equal(verified.merchantReference, "attempt_test_1");
assert.equal(verified.providerPaymentId, "2026082900000001");
assert.equal(verified.status, "CAPTURED");
assert.equal(provider.verifyNotification({ ...notificationPayload, total_amount: "1.00" }).ok, false);

const paymentRoute = readFileSync("src/app/api/orders/[id]/payment/route.ts", "utf8");
const callbackRoute = readFileSync("src/app/api/payments/alipay/notify/route.ts", "utf8");
const refundRoute = readFileSync("src/app/api/admin/orders/[id]/refund/route.ts", "utf8");
const service = readFileSync("src/lib/payments/order-payment-service.ts", "utf8");

assert.match(paymentRoute, /getCurrentUser\(\)/);
assert.match(paymentRoute, /request\.headers\.get\("Idempotency-Key"\)/);
assert.doesNotMatch(paymentRoute, /amountCents:\s*body/);
assert.match(callbackRoute, /createPaymentOperationsProvider\(\)/);
assert.match(callbackRoute, /provider\.verifyNotification\(values\)/);
assert.match(callbackRoute, /MAX_NOTIFICATION_BYTES/);
assert.match(callbackRoute, /applyPaymentNotification\(notification\)/);
assert.match(callbackRoute, /"success"/);
assert.match(refundRoute, /requireAdminUser\(\)/);
assert.match(refundRoute, /request\.headers\.get\("Idempotency-Key"\)/);
assert.match(service, /attempt\.amount !== notification\.amountCents/);
assert.match(service, /providerId[\s\S]*MARKETPLACE_SETTLEMENT_NOT_CONFIGURED/);
assert.match(service, /FOR UPDATE/);
assert.match(service, /CommerceRefundStatus\.PROCESSING, CommerceRefundStatus\.SUCCEEDED/);
assert.match(service, /notify:\$\{notification\.eventId\}/);
assert.match(service, /ProjectOrderPaymentStatus\.PAID/);
assert.match(service, /ProjectOrderPaymentStatus\.REFUNDED/);
assert.match(service, /lateOrCancelled/);

console.log("live payment foundation tests: PASS");
}

main().catch((error) => {
  console.error("live payment foundation tests: FAIL", error);
  process.exit(1);
});
