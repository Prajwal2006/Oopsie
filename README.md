# Oopsie Woopsie

**Say sorry, cutely.** Oopsie Woopsie is a cute, customizable apology website. Pick a relationship vibe, write your message, and send a private link. If they're ready to talk, they tap "Yes" (the "No" button is famously shy) and pick a time from your availability.

No accounts: the creator gets a private manage link with a secret token. Only a SHA-256 hash of that token is stored.

## Stack

- Next.js 16 (App Router, Cache Components) + TypeScript + Tailwind CSS v4
- Framer Motion + canvas-confetti
- Postgres on Neon via `pg` (node-postgres) with `attachDatabasePool` from `@vercel/functions`. This is the Neon skill's recommendation for Vercel Fluid compute.
- zod for server-side validation

## Run locally

```bash
npm install
neon env pull          # or `neon deploy`; writes DATABASE_URL(_UNPOOLED) to .env.local
npm run migrate        # applies migrations/*.sql over the direct connection
npm run dev
```

End-to-end test against the real database (needs a running server):

```bash
npm run build && npm start
npm run test:e2e       # BASE_URL defaults to http://localhost:3000
```

## Deploy (Vercel)

1. Import the repo in Vercel (framework: Next.js, detected automatically).
2. Add environment variables (see `.env.example`): `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct), and `CRON_SECRET` (any long random string). The Neon ↔ Vercel integration can set the first two for you.
3. Deploy. Vercel runs `npm run vercel-build`, which applies pending migrations on **production** deploys (using the direct connection) and then builds. Preview deploys skip migrations unless `MIGRATE_PREVIEWS=1`; a build with no database configured also just builds.
4. `vercel.json` pins functions to `cle1` (next to Neon's `aws-us-east-2`) and schedules `/api/cron/cleanup` daily to hard-delete apologies older than 30 days. Expired links are also hidden and deleted on access.

## Layout

```
migrations/0001_init.sql      schema: apologies, availability_slots, bookings, events, rate_limits
scripts/migrate.mjs           tiny migration runner (schema_migrations table)
scripts/e2e.mjs               end-to-end test against a running server + Neon
src/lib/db.ts                 pg Pool + transactions
src/lib/apologies.ts          all data access (create, events, booking, manage, cleanup)
src/lib/validation.ts         zod schemas
src/lib/time.ts               timezone math + slot generation (Intl only)
src/lib/themes.ts             vibes, colors, captions, starter templates
src/lib/rate-limit.ts         Postgres fixed-window rate limiting (hashed IPs)
src/components/DodgeButton.tsx the shy "No" button
src/components/ApologyCard.tsx themed card shared by the live page and the wizard preview
src/components/DeveloperStory.tsx  "story behind it" section on the landing page
public/prajwal-nh.jpg         developer photo
src/app/create                creator wizard
src/app/a/[slug]              recipient experience (+ OG metadata)
src/app/manage/[token]        status timeline, availability edits, delete
src/app/api/**                route handlers
```
