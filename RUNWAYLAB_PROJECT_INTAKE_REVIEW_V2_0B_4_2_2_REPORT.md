# RUNWAYLAB PROJECT INTAKE REVIEW V2.0B.4.2.2 REPORT

## Scope

This implementation completes V2.0B.4.2.2 ProjectIntake review flow in the current local code copy.

The local directory is not a verified formal Git repository. No commit, push, deploy, production database access, or production migration was performed.

## Product Decisions Implemented

- Extended ProjectIntake status lifecycle:
  - DRAFT
  - READY_FOR_REVIEW
  - SUBMITTED
  - NEEDS_INFO
  - ACCEPTED
  - DECLINED
- Added minimal ProjectIntakeEvent for user-visible review timeline.
- Kept AdminLog for backend audit only.
- ProjectIntake remains private and noindex.
- No draft image upload was added.
- ACCEPTED does not automatically create Work, CollaborationProject, or IncubationProject.
- ProjectIntake does not enter public feeds, rankings, search, public statistics, or public metadata.

## Schema And Migration

- Updated `prisma/schema.prisma`.
- Added one independent migration:
  - `prisma/migrations/20260731090000_add_project_intake_review_flow/migration.sql`
- Added `ProjectIntakeEvent`.
- Added `ProjectIntakeEventType`.
- Added review detail fields on `ProjectIntake`.
- Added `reviewedById` relation to `User`.
- No destructive migration was added.
- Existing drafts remain readable.
- Existing user ideas are not overwritten.

## Server Flow

- `completion` is calculated server-side from real fields.
- Client cannot submit or overwrite:
  - status
  - completion
  - ownerId
  - reviewedById
  - reviewedAt
  - submittedForReviewAt
- Owner and reviewer IDs come from server session.
- Status transitions are centralized in `src/lib/start-projects.ts`.
- Submit, withdraw, and admin review use transactions.
- Admin decisions are restricted to SUBMITTED intakes.
- Admin concurrent review uses `updatedAt` conditional update protection.
- Notifications are in-app only and do not enable SMS, email, or external push.

## User Experience

- Added progressive private draft completion UI.
- Added fields:
  - projectTitle
  - targetAudience
  - useScenario
  - expectedPriceBand
  - launchTiming
  - reviewMessage
- READY_FOR_REVIEW is automatically derived when required fields are complete.
- SUBMITTED means the intake is waiting for platform review.
- Users can withdraw SUBMITTED intakes and continue editing.
- NEEDS_INFO intakes can be updated and resubmitted.
- User-visible review timeline is shown on private intake details.
- `/me/projects` links users to the single next action for each intake.

## Admin Experience

- Added `/admin/project-intakes`.
- Added `/admin/project-intakes/[id]`.
- Admin can:
  - approve
  - request more information
  - decline
- Admin decisions create:
  - ProjectIntakeEvent
  - AdminLog
  - in-app Notification
- Admin list uses pagination and consolidated includes to avoid N+1-heavy rendering.

## Security And Privacy

- Private draft details are visible only to owner or active admin.
- Review mutation endpoints require active admin.
- Client-submitted status and ownership fields are rejected.
- noindex is set on private intake detail page.
- No public image upload is added for drafts.
- No production database connection was used.

## Verification

- New V2.0B.4.2.2 tests: passed.
- V2.0B.4.2.1 7 regression tests: passed.
- Existing 33 regression tests: passed.
- `npx prisma format`: passed.
- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.

## PostgreSQL 16 Empty Database Replay

Not executed on this machine because no local `psql`, `pg_isready`, PostgreSQL service, or Docker runtime is available. Production database was not accessed.

## Explicit Non-Changes

- No commit.
- No push.
- No deploy.
- No production database operation.
- No production migration execution.
- No AI auto review.
- No batch review.
- No public exposure of user ideas.
- No automatic conversion to a formal project or work.
- No draft image upload.
- No dependency upgrade.
