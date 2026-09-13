# Codex Handoff: Supabase → Neon/Vercel Migration

Last updated: 2026-09-13 ET

## Read this first

The production website is still served by GitHub Pages from `main`, backed by Supabase. Do not
change Cloudflare DNS or deploy to Vercel Production without confirming the instructor login works in
Preview first.

**`main` has moved ahead of this branch.** Since the branch was cut, `main` gained Yang Ran Angels, a
live classroom investor game whose tables and functions exist only in Supabase. Students start using
it on Monday, September 14, 2026, so Supabase will hold real passwords, portfolios, and change history
that must survive the cutover. Merge `main` and port the game before any Preview testing or cutover.
See [Changes on main since this branch was cut](#changes-on-main-since-this-branch-was-cut).

Current production state:

- Live domain: `https://ep.yangran.org`
- DNS: `ep.yangran.org` still points to `engineering-physics-wm.github.io`
- GitHub Pages deploys every push to `main`; Supabase serves all live data
- `main` is at `9ce60a6`; this branch has not merged any of the commits after `26592b3`

## Repository and Vercel state

- Repository: `Engineering-Physics-WM/engineering-physics-wm.github.io`
- Working branch: `migration/vercel-neon`
- Latest migration code commit: `7d53ce4` (later commits on this branch are handoff docs)
- Merge base with `main`: `26592b3`
- Vercel project: `four-seasons-garden/engineering-physics`
- Vercel project ID: `prj_BdsFY2AwrhlVFM65e0POD6NXdWcU`
- Vercel CLI is authenticated locally as `ryward77`
- The branch is pushed to GitHub

Latest verified Preview deployment:

`https://engineering-physics-pz5cqqcbh-four-seasons-garden.vercel.app`

That Preview was deployed with the Neon URL and a generated session secret attached to the
deployment. The branch-specific Vercel Preview environment also contains the Neon URL, session
secret, instructor email, and instructor name. The instructor password hash is not configured yet.
That Preview predates the game and does not include it.

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

## Changes on main since this branch was cut

| Commit    | Change                                                                    |
| --------- | ------------------------------------------------------------------------- |
| `c7586aa` | First Pitch Perfect II survey (superseded by `3ca598e`)                   |
| `3ca598e` | Yang Ran Angels investor game: student page, public totals, dashboard tab |
| `f7e6491` | Instant saves and $10,000 investment steps                                |
| `d88ff00` | Instructor account with its own budget                                    |
| `46d93d8` | "$X raised" labels on all six active project cards on the home page       |
| `11ebad5` | Pinned updates take the home page's featured spot                         |
| `9ce60a6` | README documents the game and the pinned rule                             |

Expected merge conflicts:

- `README.md` and `js/dashboard.jsx` changed on both sides.
- These files on `main` import the Supabase client this branch deleted: `js/catalog.jsx`,
  `js/investorGame.jsx`, and `src/lib/investorGame.ts`. They will not build until ported.

The pinned-update rule in `js/news.jsx` is frontend only and needs no backend work.

### How the game works

Read `README.md` on `main`, section "Yang Ran Angels", for the full product description. The backend
contract to preserve:

- One game row per cohort: `ep-investor-2026-2027`, with `is_open`, `totals_visible`,
  `current_event` (the class session label), `budget` (student default `1000000`), and `project_ids`.
- Preset logins by first name. Names match case- and whitespace-insensitively through `name_key`.
- Students have a $1,000,000 budget. One instructor account (`Ran`) has `is_instructor = true`, no team,
  and a $10,000,000 budget. One practice account (`Demo`) has `is_practice = true` and never counts
  toward totals.
- Amounts are whole dollars in $10,000 steps. A player cannot put money in their own team, and the
  total cannot exceed that player's budget.
- Every save that changes the portfolio writes one activity row with the before and after
  allocations, totals, and `current_event`. A save with no change returns `changed: false` and writes
  nothing.
- Public totals return one number per team, exclude practice accounts, and return nothing while
  `totals_visible` is false.
- Only the instructor can read players or activity, change game settings, reset passwords, change
  teams, or remove players.

### Supabase objects to port

The source of truth is `supabase/investor-game.sql` on `main`.

| Supabase object                                                 | Purpose                                                                                           | Suggested Vercel route          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------- |
| Table `investor_games`                                          | Game settings                                                                                     | —                               |
| Table `investor_game_players`                                   | Logins, hashed passwords, session tokens, portfolios                                              | —                               |
| Table `investor_game_activity`                                  | History of every change                                                                           | —                               |
| `investor_game_status(p_game_id)`                               | Public game status                                                                                | `GET /api/game/status`          |
| `investor_game_login(p_game_id, p_name, p_password)`            | Returns `ok`, `wrong`, or `locked`; 5 misses lock the name for 2 minutes                          | `POST /api/game/login`          |
| `investor_game_session(p_game_id, p_session_token)`             | Restores a login on reload                                                                        | `POST /api/game/session`        |
| `investor_game_save(p_game_id, p_session_token, p_allocations)` | Validates, saves, logs                                                                            | `POST /api/game/save`           |
| `investor_game_public_totals(p_game_id)`                        | Team totals only                                                                                  | `GET /api/game/totals`          |
| `investor_game_admin_update_player(...)`                        | Reset password (rotates session token) or change team (refunds money in the new team and logs it) | `PATCH /api/admin/game/players` |
| Direct instructor reads and writes                              | List players and activity, update settings, delete a player                                       | `/api/admin/game/*`             |

Porting notes:

- Password hashes were made by pgcrypto `crypt(..., gen_salt('bf', 8))`. They are bcrypt `$2a$`
  hashes, so `bcryptjs.compare` can verify them. Copy them as they are; do not re-hash.
- Copy `session_token` values unchanged so students stay logged in across the cutover. The browser
  stores only that token, in `localStorage` key `ep-investor-game-ep-investor-2026-2027`.
- Never return `password_hash` or `session_token` from admin routes.
- Keep the error meanings the frontend relies on: an unknown or reset session must make the client
  log out, and a closed game or own-team rejection must make it revert to the saved portfolio.
- Replace the Supabase calls in `src/lib/investorGame.ts` with `apiFetch`, and replace
  `isSupabaseConfigured` with `isBackendConfigured` in `js/catalog.jsx` and `js/investorGame.jsx`.
  Keep `tests/investorGame.test.ts` passing.

### Private files for the game

These live only on the instructor's machine, are ignored by git, and contain plaintext passwords.
Never commit, print, or paste them.

- `supabase/investor-game-players-2026-2027.private.sql` seeds the 20 logins
- `data/2026-2027/investor-game-logins.private.csv` is the password handout

Both SQL files were run in Supabase on 2026-09-13. Do not re-seed Neon from the private file at cutover:
that would lose portfolios, change history, and any passwords reset from the dashboard. Copy the rows
instead.

## Database transfer status

Neon schema creation succeeded with:

```sh
npm run db:migrate
```

The public Supabase data was copied successfully on 2026-08-31. Source and Neon counts matched at the
time:

| Table                      | Rows |
| -------------------------- | ---: |
| `cohort_announcements`     |    8 |
| `cohort_team_members`      |   26 |
| `ranking_allowed_students` |   18 |
| `ranking_poll_settings`    |    1 |
| `ranking_submissions`      |   18 |
| `announcement_email_jobs`  |    0 |

That copy is now stale. Supabase has more announcements, including the pinned Pitch Perfect II update
posted on 2026-09-13, and the three game tables did not exist in August. A fresh copy is required at
cutover.

Do not run `npm run db:migrate-supabase` again against the populated Neon database. The restore script
is a one-time data copy and is not an upsert migration. Plan the final copy as either an empty Neon
database followed by one full copy, or a targeted copy of the changed and new tables.

The actual Supabase connection was removed from local `.env.local` after verification. The Neon
`DATABASE_URL` remains only in the ignored local `.env.local`. Never commit or print either URL.

## Preview verification already completed

Against the latest Preview, using Vercel's authenticated curl helper:

- Homepage: `200`
- Public announcements API: `200`
- Ranking check API with a POST request: `200`
- Unauthenticated admin dashboard API: `401` as intended

None of these checks covered the game, which was not on this branch.

## Remaining work

### 1. Merge main and port the game

- Merge `origin/main` into this branch and resolve the conflicts listed above.
- Add the three game tables to `server/schema.ts` with the same constraints as
  `supabase/investor-game.sql`, and generate a Drizzle migration.
- Add the game API routes and port the frontend calls.
- Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

### 2. Configure instructor login

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

### 3. Test the protected dashboard and the game in Preview

After adding the password hash:

- Sign in as `rxyan2@wm.edu`.
- Load the dashboard for `2025-2026`.
- Confirm submissions, student allowlist, team rows, and announcements appear.
- Test saving a team assignment and editing an announcement.
- Test ranking check/submission only with an approved test account or an intentionally safe test
  record; do not create unwanted student submissions.
- Test the game only with the `Demo` practice account: log in, save a change, confirm the public
  totals ignore it, and confirm the dashboard's Yang Ran Angels tab shows the change. Do not log in or
  save as a student.

### 4. Deploy the migration branch to Vercel Production

Only after Preview login, dashboard, and game tests pass, deploy the current branch to Production. Do
not use `--prod` until the user explicitly approves the traffic cutover. The existing Vercel
Production deployment may not contain the migration branch.

### 5. Copy data and change Cloudflare DNS only at final cutover

Freeze Supabase writes right before the final copy: close investing from the dashboard's Yang Ran
Angels tab and avoid dashboard edits until DNS switches. Then copy all tables, including the three game
tables, and compare row counts between Supabase and Neon.

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
- Public announcements load, and the pinned update is featured on the home page
- Ranking check works
- Instructor login and dashboard work
- The game page, public totals page, and home page "raised" labels load; reopen investing if the
  instructor wants it open
- A student stays logged in after the cutover without re-entering a password
- No unexpected redirects or certificate errors

Keep GitHub Pages and Supabase available until these checks pass so rollback is easy. Do not delete
the legacy `supabase/` folder yet; it is retained as migration/rollback documentation.

## Security notes

- Never place `DATABASE_URL`, `SUPABASE_DB_URL`, `SESSION_SECRET`, API keys, or passwords in Git.
- A Supabase database password and Supabase secret API key were exposed during setup. Rotate both
  after confirming the migration, since the app no longer needs Supabase at runtime.
- Do not copy Supabase Auth users into the new app. The new app intentionally uses a single
  server-side instructor account configured through Vercel environment variables.
- Game passwords are low-security classroom passwords, but treat them as secrets: do not log request
  bodies from the game login route, and keep the private seed and handout files out of Git.
- Every admin game route must check the instructor session. Individual investments are private to the
  instructor.

## Useful commands

```sh
git status
git checkout migration/vercel-neon
git fetch origin && git merge origin/main
npm run typecheck
npm run lint
npm test
npm run build
vercel project inspect engineering-physics
vercel ls engineering-physics
```

The full user-facing notes are in `README.md`. After merging `main`, that file also documents the game.
