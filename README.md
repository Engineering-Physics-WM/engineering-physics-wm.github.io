# Engineering Physics Capstone - William & Mary

Public course website for the William & Mary Engineering Physics Capstone program. Students browse projects, submit ranking preferences, and follow cohort updates. The protected instructor dashboard supports rankings, team formation, mentor lists, email drafts, and public announcements.

**Live site:** [engineering-physics-wm.github.io](https://engineering-physics-wm.github.io)

**Migration handoff:** See [`CODEX_HANDOFF.md`](./CODEX_HANDOFF.md) before continuing the
Supabase-to-Neon/Vercel cutover.

## Structure

```
index.html          — single-page entry point
data/               — project and cohort data by year (JSON)
js/                 — React components (Vite)
src/                — TypeScript modules (features, lib, types) shared with js/
styles/             — CSS (design tokens, layout, pages)
supabase/           — legacy schema and one-time migration source files
api/                — Vercel serverless API routes
server/             — Drizzle, Neon, auth, and server-side helpers
drizzle/            — generated PostgreSQL migrations
public/             — static assets served at root
tests/              — Vitest unit tests
email/              — local instructor tool for drafting Apple Mail messages (see email/README.md)
```

## Running locally

```sh
npm install
npm run dev         # dev server
npm run build       # production build → dist/
npm run preview     # preview the production build locally
npm test             # run the Vitest suite
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run format       # Prettier, writes changes
```

Copy `.env.example` to `.env.local` and add the Neon database URL, session secret, instructor password
hash, and any AI provider secret needed for local API development. Use `vercel dev` when you need to
run the Vercel API routes locally; plain `npm run dev` runs the frontend only.

## Data

Project data lives in `data/<year>/`. The app is prepared for `2025-2026`, `2026-2027`, and `2027-2028`; each cohort can have its own project slate, status labels, announcements, ranking poll state, and dashboard records.

Public files attached to announcements can be placed in `public/announcements/<year>/`. Cohort announcements load from the Vercel API when configured. The `js/data.js` cohort announcements are the fallback and seed source.

Only public course information should be committed to this repository. Student rosters, ranking submissions, team assignments, student emails, private notes, and other private course records belong in Neon or ignored local files.

When adding a cohort:

- Put public project/archive materials under `data/<year>/`.
- Put public announcement files under `public/announcements/<year>/`.
- Add or update the cohort entry in `js/data.js`.
- Load private allowlists, ranking submissions, and saved team rows into Neon using the same `cohort_year`.

## Dashboard

The instructor dashboard (protected by the server-side instructor session) includes:

- **Distribution** — live poll ranking results across all projects
- **Conflict heatmap** — overlap between project preferences
- **Student responses** — individual rankings visible only to the instructor
- **Auto team-making** — algorithm-generated team previews with manual adjustment
- **Email drafts** — compose BCC emails to students, mentors, or specific teams; opens the system mail client
- **Updates** — create, edit, and delete public cohort announcements

The dashboard reads the selected cohort year, so the same views work for previous, current, and future cohorts once their Neon rows use the matching `cohort_year`.

The dashboard is for course administration. Do not publish individual student rankings, private notes, or non-directory student information on public pages.

## Deployment

The migration branch is designed for Vercel. Vercel builds the Vite frontend and exposes the files in
`api/` as serverless endpoints. Configure these server-only environment variables in the Vercel
project: `DATABASE_URL`, `SESSION_SECRET`, `INSTRUCTOR_PASSWORD_HASH`, `INSTRUCTOR_EMAIL`, and
`INSTRUCTOR_NAME`. Add `AI_EMAIL_PROVIDER` plus the matching provider key if the dashboard's AI
rewrite button is needed. Keep `DATABASE_URL` and provider keys free of the `VITE_` prefix.

The current GitHub Pages workflow remains the rollback deployment until the Vercel preview has been
tested and the `ep.yangran.org` DNS record is cut over.

## Database migration

The Drizzle schema lives in `server/schema.ts`, with generated migrations in `drizzle/migrations/`.
On a new Neon database, run:

```sh
npm run db:migrate
```

To copy the existing public Supabase data after the schema is created, put both connection strings in
the local ignored `.env.local` file and run:

```sh
npm run db:migrate-supabase
```

The script copies only the `public` schema's data. Supabase Auth and Edge Functions are not restored;
this app uses a new server-side instructor session and the AI rewrite code now runs as a Vercel API
route. Do not run the data migration repeatedly against a populated Neon database.

Generate an instructor password hash locally with:

```sh
npm run db:password-hash
```

## Automated database reporting

A Claude Code cloud agent runs every **Sunday at 6 PM ET** to query the live Neon database and generate a weekly learning report. The report covers:

- Poll open/closed status and cohort settings
- Ranking submission count and weekly participation rate
- Allowed student and team assignment totals
- Recent announcements (published vs. draft)
- Any schema file changes committed that week
- One database learning insight and a suggested action item

The agent connects directly via `psql` using the Neon database URL. Manage or view past runs at [claude.ai/code/routines](https://claude.ai/code/routines). Update the routine with the Neon credentials after the migration is complete.
