# Engineering Physics Capstone · William & Mary

Public website for the William & Mary Engineering Physics Capstone program. Students browse projects, submit ranking preferences, and follow cohort updates. The instructor dashboard handles rankings, team assignments, and announcements.

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

Project data lives in `data/<year>/`. Student rosters and private cohort data are stored in Supabase and never checked in.

Cohort announcements load from Supabase when configured. The `js/data.js` announcements array is the fallback and seed source. Files attached to announcements can be placed in `public/announcements/<year>/`.

## Dashboard

The instructor dashboard (protected by Supabase auth) includes:

- **Distribution** — live poll ranking results across all projects
- **Conflict heatmap** — overlap between project preferences
- **Student responses** — individual rankings with expandable full lists
- **Auto team-making** — algorithm-generated team preview with manual drag-to-adjust
- **Email drafts** — compose BCC emails to students, mentors, or specific teams; opens the system mail client
- **Updates** — create, edit, and delete public cohort announcements

## Deployment

Push to `main` to trigger the Vite build workflow and deploy to GitHub Pages. The workflow reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from repository variables.

Pages should be configured to deploy from **GitHub Actions** in the repository settings.

The dashboard email rewrite helper runs as the Supabase Edge Function `rewrite-email`. For Gemini, set these Supabase secrets:

```sh
supabase secrets set AI_EMAIL_PROVIDER=gemini GEMINI_API_KEY=...
```

Optional: set `AI_EMAIL_MODEL` to override the default `gemini-2.5-flash`.
