# Engineering Physics Capstone - William & Mary

Public course website for the William & Mary Engineering Physics Capstone program. Students browse projects, submit ranking preferences, and follow cohort updates. The protected instructor dashboard supports rankings, team formation, mentor lists, email drafts, and public announcements.

**Live site:** [engineering-physics-wm.github.io](https://engineering-physics-wm.github.io)

## Structure

```
index.html          — single-page entry point
data/               — project and cohort data by year (JSON)
js/                 — React components (Vite)
src/                — TypeScript modules (features, lib, types) shared with js/
styles/             — CSS (design tokens, layout, pages)
supabase/           — database schema files
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

Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable key for local development.

## Data

Project data lives in `data/<year>/`. The app is prepared for `2025-2026`, `2026-2027`, and `2027-2028`; each cohort can have its own project slate, status labels, announcements, ranking poll state, and dashboard records.

Public files attached to announcements can be placed in `public/announcements/<year>/`. Cohort announcements load from Supabase when configured. The `js/data.js` cohort announcements are the fallback and seed source.

Only public course information should be committed to this repository. Student rosters, ranking submissions, team assignments, student emails, private notes, and other private course records belong in Supabase or ignored local files.

When adding a cohort:

- Put public project/archive materials under `data/<year>/`.
- Put public announcement files under `public/announcements/<year>/`.
- Add or update the cohort entry in `js/data.js`.
- Load private allowlists, ranking submissions, and saved team rows into Supabase using the same `cohort_year`.

## Dashboard

The instructor dashboard (protected by Supabase auth) includes:

- **Distribution** — live poll ranking results across all projects
- **Conflict heatmap** — overlap between project preferences
- **Student responses** — individual rankings visible only to the instructor
- **Auto team-making** — algorithm-generated team previews with manual adjustment
- **Email drafts** — compose BCC emails to students, mentors, or specific teams; opens the system mail client
- **Updates** — create, edit, and delete public cohort announcements

The dashboard reads the selected cohort year, so the same views work for previous, current, and future cohorts once their Supabase rows use the matching `cohort_year`.

The dashboard is for course administration. Do not publish individual student rankings, private notes, or non-directory student information on public pages.

## Deployment

Push to `main` to trigger the Vite build workflow and deploy to GitHub Pages. The workflow reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from repository variables.

Pages should be configured to deploy from **GitHub Actions** in the repository settings.

The dashboard email rewrite helper runs as the Supabase Edge Function `rewrite-email`. For Gemini, set these Supabase secrets:

```sh
supabase secrets set AI_EMAIL_PROVIDER=gemini GEMINI_API_KEY=...
```

Optional: set `AI_EMAIL_MODEL` to override the default `gemini-2.5-flash`.

## Automated database reporting

A Claude Code cloud agent runs every **Sunday at 6 PM ET** to query the live Supabase database and generate a weekly learning report. The report covers:

- Poll open/closed status and cohort settings
- Ranking submission count and weekly participation rate
- Allowed student and team assignment totals
- Recent announcements (published vs. draft)
- Any schema file changes committed that week
- One database learning insight and a suggested action item

The agent connects directly via `psql` using the project database URL. Manage or view past runs at [claude.ai/code/routines](https://claude.ai/code/routines). If the database password is rotated, update the routine prompt with the new credentials.
