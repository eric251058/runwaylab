# RunwayLab Online Payment Runbook

RunwayLab's first live payment channel is Alipay page pay for CNY orders. Payment is disabled by default and requires two feature flags, complete provider configuration, and an explicit production acknowledgement.

## Scope and settlement boundary

- Online payment is allowed only for platform-owned orders whose `providerId` is empty.
- Collaboration orders owned by a third-party provider are rejected with `MARKETPLACE_SETTLEMENT_NOT_CONFIGURED`.
- Do not enable third-party collection until the Alipay merchant split product is contracted, every provider has a verified split recipient, and the split/refund reconciliation path has passed acceptance testing.
- RunwayLab never accepts personal Alipay accounts, personal QR codes, or off-platform transfer instructions as online payment configuration.

## Merchant prerequisites

Before changing any switch, confirm all of the following in the Alipay merchant console:

1. The contracting entity and settlement bank account have passed verification.
2. Computer website payment (`alipay.trade.page.pay`) and original-channel refund (`alipay.trade.refund`) are enabled.
3. The application uses RSA2 keys and has the production domain configured.
4. The asynchronous notification URL is exactly:

   `https://fashionstyleai.com/api/payments/alipay/notify`

5. The merchant has recorded its Alipay application ID, merchant seller ID, application private key, and Alipay public key. Never commit or paste these values into tickets or chat.

## Environment variables

Configure secrets directly in the production server environment. Keep both feature flags disabled during deployment:

```env
FEATURE_LIVE_PAYMENT=false
FEATURE_MANUAL_PAYMENT_PILOT=false
PAYMENT_PROVIDER=alipay
PAYMENT_PUBLIC_BASE_URL=https://fashionstyleai.com
PAYMENT_LIVE_ACK=RUNWAYLAB_LIVE_PAYMENT_APPROVED
ALIPAY_APP_ID=<merchant application id>
ALIPAY_PRIVATE_KEY=<application private key in PEM format>
ALIPAY_PUBLIC_KEY=<Alipay public key in PEM format>
ALIPAY_SELLER_ID=<merchant seller id>
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
```

Use `\\n` inside a single-line environment value or a normal multiline PEM value. Never use a certificate serial number in place of the Alipay public key.

For sandbox testing only, use sandbox credentials and:

```env
ALIPAY_GATEWAY=https://openapi-sandbox.dl.alipaydev.com/gateway.do
```

Production credentials and sandbox credentials must never be mixed.

## Deployment order

1. Back up PostgreSQL with `pg_dump --format=custom` and retain the previous release symlink.
2. Deploy the application while `feature.live_payment` and `feature.manual_payment_pilot` remain disabled.
3. Run `prisma validate`, `prisma generate`, `prisma migrate deploy`, the production build, and ordinary application health checks.
4. Restart PM2 with the configured provider environment and confirm the site still serves orders without exposing a payment button.
5. In `/admin/features`, enable **真实支付** and **人工支付试点** only for the controlled pilot window. Database feature values override environment defaults.

The application will still refuse payment if the provider name, production acknowledgement, merchant keys, public base URL, or allowed gateway is missing.

## Pilot acceptance

Create a platform-owned CNY order with `providerId` empty and use the smallest merchant-approved amount. Verify all of these outcomes:

1. Repeated clicks and repeated requests with the same `Idempotency-Key` do not create duplicate payment attempts.
2. The browser is redirected only to an HTTPS Alipay checkout URL.
3. Returning from Alipay does not mark the order paid by itself.
4. Only a valid signed asynchronous callback with matching application, seller, order reference, currency, and exact amount changes the attempt to `CAPTURED` and the order to `PAID`.
5. Replaying the same callback does not duplicate state events.
6. A full original-channel refund from `/admin/orders` succeeds once and records the refund reference.
7. Repeating the same refund request does not create an additional refund.
8. A partial refund cannot exceed the captured amount minus previous successful refunds.
9. A collaboration order with a non-empty `providerId` remains blocked.

Do not widen the pilot until payment, callback replay, full refund, partial refund, timeout, and failure recovery have all been observed with real merchant data.

## Monitoring and reconciliation

During the pilot, review:

- payment attempts left in `PENDING` or `PROCESSING` after the checkout window;
- verified callbacks rejected for amount, merchant, application, or currency mismatch;
- refunds left in `PROCESSING`, which indicate an unknown external result and must be retried with the same refund reference;
- the Alipay merchant statement against RunwayLab captured payments and successful refunds;
- PM2 errors around `/api/payments/alipay/notify` and the admin refund route.

Never create a new refund reference when the result of the previous request is unknown. Query or retry with the same reference to preserve provider idempotency.

## Emergency stop and rollback

For a payment-only emergency stop, disable either **真实支付** or **人工支付试点** in `/admin/features`. This immediately prevents new checkouts while preserving callback verification and the payment records required for reconciliation.

Do not roll back the database merely because payment is disabled. Captured payments and refunds are financial records and must be retained. If an application rollback is required, switch the application symlink back to the previous compatible release, restart PM2, and keep the payment flags off until callback and refund compatibility has been verified.
