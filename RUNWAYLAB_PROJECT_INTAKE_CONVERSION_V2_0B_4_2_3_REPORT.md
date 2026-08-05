# RUNWAYLAB PROJECT INTAKE CONVERSION V2.0B.4.2.3 REPORT

## Scope

V2.0B.4.2.3 implements controlled conversion from an accepted private `ProjectIntake` into a private `CollaborationProject`.

This local code copy is not a verified Git baseline. No commit, push, deployment, production database connection, or production migration was performed.

## Product Decisions

- `CollaborationProject` is reused as the formal long-term project record.
- No `Work`, `IncubationProject`, third project model, Demand, ProviderProposal, order, payment, marketplace entry, preorder entry, or supplier opportunity is automatically created.
- `ProjectIntake` remains `ACCEPTED`; converted state is derived from `linkedCollaborationProjectId` and `convertedAt`.
- Converted projects default to `DRAFT` and `PRIVATE`.
- Converted project pages are private owner/admin pages and noindexed.
- Public project filtering now requires `visibility = PUBLIC`.

## Prisma Changes

- Added `ProjectIntake.convertedAt`.
- Added `ProjectIntake.convertedById`.
- Added `ProjectIntake.convertedBy`.
- Added `ProjectIntakeEventType.CONVERTED`.
- Changed `ProjectIntake.linkedCollaborationProjectId` to a unique one-to-one relation.
- Made `CollaborationProject.workId` optional so an accepted intake can become a formal private project without inventing a Work record.
- Added indexes for converted intake administration.

Migration:

- `prisma/migrations/20260805090000_add_project_intake_conversion_flow/migration.sql`

## Backend

- Added `POST /api/admin/project-intakes/[id]/convert`.
- Request body is strict and only accepts `expectedUpdatedAt`.
- Admin identity comes from the server session.
- Owner identity comes from the intake owner.
- Conversion runs in a serializable transaction.
- Concurrency is protected with `updatedAt` conditional update.
- Repeated conversion attempts are idempotent and return the already linked project.
- Unique and serialization conflicts are caught and converted into a safe message.
- Conversion writes:
  - private `CollaborationProject`
  - `ProjectIntakeEvent` with `CONVERTED`
  - `AdminLog`
  - owner notification

## Frontend

- Added admin conversion panel on `/admin/project-intakes/[id]`.
- Added converted and pending-conversion filters on `/admin/project-intakes`.
- Added private formal project detail page at `/me/projects/collaboration/[id]`.
- Updated `/me/projects` to show startup drafts before conversion and formal projects after conversion, avoiding duplicate display.
- Updated startup draft detail page to link to the formal project after conversion.
- Added null-safe handling for `CollaborationProject` rows without a linked Work in public/admin project surfaces.

## Public Isolation

- Converted projects are created as private draft projects.
- `publicProjectWhere()` requires `CollaborationProjectVisibility.PUBLIC`.
- Converted private projects do not enter public project lists, public project detail routes, work streams, rankings, search, public metadata, preorder, or supplier opportunity flows.

## Tests

New V2.0B.4.2.3 tests:

- `scripts/project-intake-conversion-eligibility-tests.ts`
- `scripts/project-intake-conversion-idempotency-tests.ts`
- `scripts/project-intake-conversion-permission-tests.ts`
- `scripts/project-intake-conversion-transaction-tests.ts`
- `scripts/project-intake-conversion-mapping-tests.ts`
- `scripts/project-intake-conversion-event-tests.ts`
- `scripts/project-intake-conversion-notification-tests.ts`
- `scripts/project-intake-conversion-workbench-tests.ts`
- `scripts/project-intake-conversion-public-isolation-tests.ts`
- `scripts/project-intake-conversion-migration-tests.ts`

Results:

- New 10 tests: passed.
- All 60 local test scripts: passed.
- Custom trailing whitespace check for modified files: passed.
- `git diff --check`: not executed because the current directory is not a Git repository.

## Verification

- `npx prisma format`: passed.
- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.

PostgreSQL 16 empty-database replay:

- Not executed in this local copy because `psql`, `pg_isready`, and Docker are not installed/available.
- No production database was connected.
- No production migration was executed.

## Changed Files

- `prisma/schema.prisma`
- `prisma/migrations/20260805090000_add_project_intake_conversion_flow/migration.sql`
- `src/lib/start-projects/validation.ts`
- `src/lib/start-projects.ts`
- `src/lib/commercial-collaboration.ts`
- `src/lib/commercial-collaboration-actions.ts`
- `src/lib/private-collaboration-projects.ts`
- `src/lib/projects/actions.ts`
- `src/app/api/admin/project-intakes/[id]/convert/route.ts`
- `src/app/api/projects/[id]/proposals/route.ts`
- `src/app/admin/page.tsx`
- `src/app/admin/project-intakes/page.tsx`
- `src/app/admin/project-intakes/[id]/page.tsx`
- `src/app/admin/projects/page.tsx`
- `src/app/me/projects/page.tsx`
- `src/app/me/projects/collaboration/[id]/page.tsx`
- `src/app/me/start-projects/[id]/page.tsx`
- `src/app/projects/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/components/admin/ProjectIntakeConversionPanel.tsx`
- `src/components/start/ProjectIntakeDetailsFlow.tsx`
- New conversion test scripts listed above.
- `RUNWAYLAB_PROJECT_INTAKE_CONVERSION_V2_0B_4_2_3_REPORT.md`

## Not Done

- No automatic conversion to Work.
- No automatic conversion to IncubationProject.
- No supplier opportunity generation.
- No marketplace publication.
- No preorder setup.
- No AI evaluation.
- No batch approval.
- No public exposure of user ideas.
