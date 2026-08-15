# RunwayLab V2.1 Transaction Data Layer

## Scope

This batch extends the existing ProjectOrder model. It does not create a second order system and does not connect a live payment provider.

## Added records

- CommercePaymentAttempt: provider attempts and idempotency keys.
- CommerceRefund: refund lifecycle linked to an order and optional payment attempt.
- CommerceIdempotencyRecord: request hash, processing lock, cached response and expiry.
- CommerceStateEvent: append-only audit trail for campaign, order, payment, refund and fulfillment.

## Safety properties

- Monetary values use integer minor units.
- Payment and refund commands have unique idempotency keys.
- Provider references are unique per provider when present.
- Records link to the existing ProjectOrder source of truth.
- The migration is additive: no drop, truncate or delete statements.
- This migration is for isolated-database validation only and must not be applied to production before migration and rollback rehearsal passes.

## Not included

- No provider SDK, webhook route or payment credentials.
- No production database migration.
- No checkout UI or claim that payment is available.
- No threshold settlement, automatic refund or payout execution yet.

## Validation

Run prisma format, prisma validate, prisma generate, the transaction data layer test, TypeScript typecheck, all script tests and the production build.
