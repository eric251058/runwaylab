# RunwayLab V2.1 Transaction Service Layer

## Scope

This batch adds provider-independent transaction orchestration on top of the V2.1 state-machine and data contracts.

- idempotent order authorization intents
- replay-safe payment callback processing
- presale funded/failed settlement decisions
- bounded refund intent planning
- deterministic request fingerprints
- concurrent replay tests

## Safety boundary

The service returns auditable transaction intents. It does not call a payment provider, capture funds, issue refunds, run migrations, or deploy production code. Campaign funding deliberately creates no automatic capture intent until provider authorization lifetime, legal terms, and production callback verification are independently validated.

`MemoryIdempotencyStore` is a deterministic test/reference adapter only. Production must implement `IdempotencyStore` with an atomic database transaction and the unique keys introduced by the transaction data-layer migration.

## Acceptance gates

- one execution under concurrent duplicate order commands
- one execution under concurrent duplicate provider callbacks
- conflicting reuse of an idempotency key is rejected
- illegal state transitions are rejected
- refund totals cannot exceed captured funds
- funded and failed campaigns produce state decisions without hidden payment side effects
