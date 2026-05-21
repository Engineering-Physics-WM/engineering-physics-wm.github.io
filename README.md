# Engineering Physics Capstone - William & Mary

Public course website for the William & Mary Engineering Physics Capstone program. Students browse projects, submit ranking preferences, and follow cohort updates. The protected instructor dashboard supports rankings, team formation, mentor lists, email drafts, and public announcements.

**Live site:** [engineering-physics-wm.github.io](https://engineering-physics-wm.github.io)

## Structure

```
index.html          — single-page entry point
data/               — project and cohort data by year (JSON)
js/                 — React components (Vite + esbuild)
styles/             — CSS (design tokens, layout, pages)
supabase/           — database schema files
public/             — static assets served at root
```

## Running locally

```sh
npm install
npm run dev        # dev server
npm run build      # production build → dist/
npm run preview    # preview the production build locally
```

Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable key for local development.

## Data

Project data lives in `data/<year>/`. Student rosters, ranking submissions, team assignments, and other private course records are stored in Supabase and are not checked in.

Cohort announcements load from Supabase when configured. The `js/data.js` announcements array is the fallback and seed source. Public files attached to announcements can be placed in `public/announcements/<year>/`.

Only public course information should be committed to this repository. Student preference data and private roster details belong in the authenticated dashboard/database.

## Dashboard

The instructor dashboard (protected by Supabase auth) includes:

- **Distribution** — live poll ranking results across all projects
- **Conflict heatmap** — overlap between project preferences
- **Student responses** — individual rankings visible only to the instructor
- **Auto team-making** — algorithm-generated team previews with manual adjustment
- **Email drafts** — compose BCC emails to students, mentors, or specific teams; opens the system mail client
- **Updates** — create, edit, and delete public cohort announcements

The dashboard is for course administration. Do not publish individual student rankings, private notes, or non-directory student information on public pages.

## Deployment

Push to `main` to trigger the Vite build workflow and deploy to GitHub Pages. The workflow reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from repository variables.

Pages should be configured to deploy from **GitHub Actions** in the repository settings.

The dashboard email rewrite helper runs as the Supabase Edge Function `rewrite-email`. For Gemini, set these Supabase secrets:

```sh
supabase secrets set AI_EMAIL_PROVIDER=gemini GEMINI_API_KEY=...
```

Optional: set `AI_EMAIL_MODEL` to override the default `gemini-2.5-flash`.
