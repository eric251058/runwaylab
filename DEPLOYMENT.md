# RunwayLab Vercel Deployment

## Vercel environment variables

Set these variables in the Vercel project settings before deploying:

```env
DATABASE_URL=
SESSION_SECRET=
STORAGE_DRIVER=local
LOCAL_UPLOAD_DIR=public/uploads
PUBLIC_UPLOAD_BASE_URL=/uploads
```

Use the production PostgreSQL connection string for `DATABASE_URL`.
Use a long random value for `SESSION_SECRET`.

## Build settings

- Framework preset: Next.js
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: Next.js default

The build script runs `prisma generate` before `next build`.
Do not run Prisma migrate or seed during Vercel build.

## Database

Run migrations and seed data from a trusted development or CI environment before production deployment.
The production deployment should only read the configured PostgreSQL database and serve the app.
