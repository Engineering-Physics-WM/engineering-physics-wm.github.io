# Codex Handoff: Supabase → Neon/Vercel Migration

Last updated: 2026-08-31 ET

## Read this first

The production website is still served by GitHub Pages. Do not change Cloudflare DNS or deploy to
Vercel Production without confirming the instructor login works in Preview first.

Current production state:

- Live domain: `https://ep.yangran.org`
- DNS: `ep.yangran.org` still points to `engineering-physics-wm.github.io`
- GitHub Pages, Supabase, `main`, and the production traffic path remain unchanged

## Repository and Vercel state

- Repository: `Engineering-Physics-WM/engineering-physics-wm.github.io`
- Working branch: `migration/vercel-neon`
- Latest migration commit: `7d53ce4`
- Vercel project: `four-seasons-garden/engineering-physics`
- Vercel project ID: `prj_BdsFY2AwrhlVFM65e0POD6NXdWcU`
- Vercel CLI is authenticated locally as `ryward77`
- The branch is pushed to GitHub

Latest verified Preview deployment:

`https://engineering-physics-pz5cqqcbh-four-seasons-garden.vercel.app`

That Preview was deployed with the Neon URL and a generated session secret attached to the
deployment. The branch-specific Vercel Preview environment also contains the Neon URL, session
secret, instructor email, and instructor name. The instructor password hash is not configured yet.

## Completed work

The branch now contains:

- Drizzle PostgreSQL schema in `server/schema.ts`
- Generated migration in `drizzle/migrations/`
- Neon database helper in `server/db.ts`
- Vercel API routes under `api/`
- Server-side instructor sessions using `jose` and `bcryptjs`
- Frontend calls routed through `src/lib/apiClient.ts`
- Supabase runtime clients removed from the new branch
- Vercel configuration in `vercel.json`
- One-time migration script in `scripts/migrate-supabase-to-neon.mjs`
- Password hash helper in `scripts/generate-password-hash.mjs`

The migration script was fixed to load `.env.local`, and API/server imports use explicit `.js`
extensions because Vercel runs the compiled functions as Node ESM.

## Database transfer status

Neon schema creation succeeded with:

```sh
npm run db:migrate
```

The public Supabase data was copied successfully. Source and Neon counts matched:

| Table                      | Rows |
| -------------------------- | ---: |
| `cohort_announcements`     |    8 |
| `cohort_team_members`      |   26 |
| `ranking_allowed_students` |   18 |
| `ranking_poll_settings`    |    1 |
| `ranking_submissions`      |   18 |
| `announcement_email_jobs`  |    0 |

Do not run `npm run db:migrate-supabase` again against the populated Neon database. The restore
script is a one-time data copy and is not an upsert migration.

The actual Supabase connection was removed from local `.env.local` after verification. The Neon
`DATABASE_URL` remains only in the ignored local `.env.local`. Never commit or print either URL.

## Preview verification already completed

Against the latest Preview, using Vercel's authenticated curl helper:

- Homepage: `200`
- Public announcements API: `200`
- Ranking check API with a POST request: `200`
- Unauthenticated admin dashboard API: `401` as intended

## Remaining work

### 1. Configure instructor login

The only required application secret still missing is `INSTRUCTOR_PASSWORD_HASH`.

Generate it locally without sending the password to chat:

```sh
npm run db:password-hash
```

Add the resulting bcrypt hash to Vercel for both:

- Preview branch `migration/vercel-neon`
- Production

The Vercel variables already configured or expected are:

```text
DATABASE_URL
SESSION_SECRET
INSTRUCTOR_EMAIL=rxyan2@wm.edu
INSTRUCTOR_NAME=Ran Yang
INSTRUCTOR_PASSWORD_HASH
```

AI rewrite is optional. If needed, configure `AI_EMAIL_PROVIDER`, the matching provider key, and
`AI_EMAIL_MODEL` as server-only variables.

### 2. Test the protected dashboard in Preview

After adding the password hash:

- Sign in as `rxyan2@wm.edu`.
- Load the dashboard for `2025-2026`.
- Confirm submissions, student allowlist, team rows, and announcements appear.
- Test saving a team assignment and editing an announcement.
- Test ranking check/submission only with an approved test account or an intentionally safe test
  record; do not create unwanted student submissions.

### 3. Deploy the migration branch to Vercel Production

Only after Preview login and dashboard tests pass, deploy the current branch to Production. Do not
use `--prod` until the user explicitly approves the traffic cutover. The existing Vercel Production
deployment may not contain the migration branch.

### 4. Change Cloudflare DNS only at final cutover

Vercel currently reports the recommended record:

```text
Type: A
Name: ep
Value: 76.76.21.21
Proxy: DNS only / gray cloud
```

Before adding it, remove the existing CNAME for `ep` pointing to
`engineering-physics-wm.github.io`. Do not leave both records. The Vercel project already has
`ep.yangran.org` assigned, but DNS currently still resolves to GitHub Pages.

After DNS propagation, verify:

- `https://ep.yangran.org` serves the Vercel build
- Public announcements load
- Ranking check works
- Instructor login and dashboard work
- No unexpected redirects or certificate errors

Keep GitHub Pages and Supabase available until these checks pass so rollback is easy. Do not delete
the legacy `supabase/` folder yet; it is retained as migration/rollback documentation.

## Security notes

- Never place `DATABASE_URL`, `SUPABASE_DB_URL`, `SESSION_SECRET`, API keys, or passwords in Git.
- A Supabase database password and Supabase secret API key were exposed during setup. Rotate both
  after confirming the migration, since the app no longer needs Supabase at runtime.
- Do not copy Supabase Auth users into the new app. The new app intentionally uses a single
  server-side instructor account configured through Vercel environment variables.

## Useful commands

```sh
git status
git checkout migration/vercel-neon
npm run typecheck
npm run lint
npm test
npm run build
vercel project inspect engineering-physics
vercel ls engineering-physics
```

The full user-facing migration notes are in `README.md`.
