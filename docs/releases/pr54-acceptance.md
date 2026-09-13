# PR 54 acceptance and release gates

This is a draft candidate for the single final deployment. No production changes have been made by this batch.

## Code validation

- 133 contract files pass, including actual route handlers with mocked authentication and database operations.
- TypeScript passes. The production build is checked separately in CI.
- Inquiry creation uses `(userId, clientId)` uniqueness; reply creation uses `(senderId, clientId)` uniqueness.
- Matching retries return the existing record before rate counting or terminal-state rejection; changed payloads return 409.
- Reply status mutation and reply insertion remain in one transaction. Notifications run only for a new committed record.
- New clients retain hashed-payload submission IDs in session storage for 24 hours, with an in-memory fallback when storage is blocked. Confirmed replies rotate their IDs. Closing the tab or blocked storage limits refresh protection; older callers without a key remain supported and are not deduplicated. Notification delivery is not a transactional outbox and is not guaranteed after a process crash.

## Required before release

1. Apply both additive migrations to an isolated PostgreSQL database with representative fixtures. Check existing rows, foreign keys, nullable unique indexes, simultaneous identical requests, changed-payload conflicts and transaction rollback.
2. Verify anonymous, buyer, provider, unrelated user and administrator flows in desktop and mobile browsers. Cover support history privacy, administrator response conflicts, inquiry input retention and same-page network retries.
3. Verify the production reverse proxy preserves the origin used by support endpoints.
4. Confirm the actual RunwayLab host, active release, available disk and a restorable database backup. Historical host and disk observations do not establish current state.
5. Review migration SQL, deploy the exact tested commit once, then verify critical pages, media, support and inquiry flows. Do not publish incomplete project drafts automatically.

## Migration and rollback

Apply migrations with the repository's production migration procedure before starting the new application. The support table and inquiry key/hash columns are additive. An application rollback can retain these additions; do not drop support requests or deduplication keys during rollback. Confirm the actual prior application's compatibility in staging. Never use `prisma migrate reset` on production.
