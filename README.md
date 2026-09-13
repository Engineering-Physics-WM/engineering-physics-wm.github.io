# Engineering Physics Capstone - William & Mary

Public course website for the William & Mary Engineering Physics Capstone program. Students browse projects, follow cohort updates, open assignments from the syllabus, and play Yang Ran Angels, an in-class investor game. The protected instructor dashboard supports rankings, team formation, mentor lists, email drafts, public announcements, and the investor game.

**Live site:** [ep.yangran.org](https://ep.yangran.org)

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

Public files attached to announcements can be placed in `public/announcements/<year>/`. Cohort announcements load from Supabase when configured. The `js/data.js` cohort announcements are the fallback and seed source; a live announcement with the same slug replaces the built-in one.

The home page features one update:

- A pinned update always wins, even when its date is in the future. With several pinned, the one with the latest date wins.
- With nothing pinned, the newest update dated today or earlier is featured.
- Unpin an update after its class so the next update can take the spot.

Only public course information should be committed to this repository. Student rosters, ranking submissions, team assignments, student emails, passwords, private notes, and other private course records belong in Supabase or ignored local files. Files matching `supabase/*.private.sql` and `data/**/*.private.*` are ignored by git.

When adding a cohort:

- Put public project/archive materials under `data/<year>/`.
- Put public announcement files under `public/announcements/<year>/`.
- Add or update the cohort entry in `js/data.js`.
- Load private allowlists, ranking submissions, and saved team rows into Supabase using the same `cohort_year`.

## Yang Ran Angels (investor game)

A classroom simulation that runs from Pitch Perfect II through later pitches and progress reports. It uses play money only and is not a company, fund, or security offering; the student page carries a legal disclaimer saying so.

### How it works

- Students log in with **Angel Login** using their first name and a preset password.
- Each student has **$1,000,000**. The instructor account has its own budget.
- Money moves in **$10,000 steps**, into any team except the student's own. The total cannot exceed the account's budget.
- Every change **saves instantly**; there is no submit button. Each saved change is logged with the current class session label.
- Portfolios carry over all year, so students can move money between teams after later sessions.
- The public sees **team totals only**. Only the instructor sees who invested what.
- A **practice account** (`Demo`) never counts toward totals.

### Pages

| Page                    | Route                                            | Access                                                   |
| ----------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| Student game            | `#/investor-game` (short link `#/invest`)        | Public, login required to invest                         |
| Live team totals        | `#/investor-game/totals` (short link `#/totals`) | Public                                                   |
| Home page project cards | `#/`                                             | Public, shows "$X raised" on each active team            |
| Syllabus cards          | `#/syllabus`                                     | Public, on Pitch Perfect II/III and Progress Report rows |
| Instructor view         | Dashboard → **Yang Ran Angels** tab              | Instructor sign-in                                       |

### Setup in Supabase

Run these in the Supabase SQL Editor, in order. Both are safe to re-run.

1. `supabase/investor-game.sql` creates the tables, row-level security, and functions, and upgrades tables created by earlier versions.
2. `supabase/investor-game-players-2026-2027.private.sql` creates the logins. It is not in git because it contains plaintext passwords. Re-running skips existing accounts, so passwords reset from the dashboard are kept.

The matching password handout is `data/2026-2027/investor-game-logins.private.csv`, also ignored by git.

### Running it in class

From the dashboard's **Yang Ran Angels** tab:

- **Open or close investing.** Closed games still let students log in and view portfolios.
- **Hide or show public totals.** Hiding removes the totals page chart and the home page "raised" labels.
- **Set the class session** (for example `Progress Report I`) before each session so new changes are logged under it.
- **Reset a password, change a student's team, or remove an account.** A password reset signs the student out everywhere; a team change returns any money already in the new team to the student's wallet.

The tab also shows team totals, each student's portfolio, and the full history of changes.

### Reusing it for another cohort

- Create a new game row and seed file with a new `game_id`, and update `INVESTOR_GAME_ID`, `GAME_COHORT_YEAR`, and `GAME_PROJECT_IDS` in `src/lib/investorGame.ts`.
- Team ids must match between `supabase/investor-game.sql`, `GAME_PROJECT_IDS`, and the project ids in `js/data.js`. Short team names live in `js/investorGame.jsx`.
- Login names must be unique within a game; use a last initial when first names repeat.

### Code

- `js/investorGame.jsx` — student page, public totals page, and dashboard tab
- `src/lib/investorGame.ts` — budget math and Supabase calls
- `supabase/investor-game.sql` — schema, security rules, and database functions
- `tests/investorGame.test.ts` — unit tests for the budget rules

## Dashboard

The instructor dashboard (protected by Supabase auth) includes:

- **Distribution** — live poll ranking results across all projects
- **Conflict heatmap** — overlap between project preferences
- **Student responses** — individual rankings visible only to the instructor
- **Auto team-making** — algorithm-generated team previews with manual adjustment
- **Email drafts** — compose BCC emails to students, mentors, or specific teams; opens the system mail client
- **Updates** — create, edit, and delete public cohort announcements
- **Yang Ran Angels** — run the investor game and see individual investments and change history

The dashboard reads the selected cohort year, so the same views work for previous, current, and future cohorts once their Supabase rows use the matching `cohort_year`.

The dashboard is for course administration. Do not publish individual student rankings, investments, private notes, or non-directory student information on public pages.

## Deployment

Push to `main` to trigger the Vite build workflow and deploy to GitHub Pages at ep.yangran.org. The workflow runs typecheck, lint, and tests before building, and reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from repository variables.

Pages should be configured to deploy from **GitHub Actions** in the repository settings.

Database changes are not deployed by the workflow. Run new or changed files in `supabase/` in the Supabase SQL Editor.

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
