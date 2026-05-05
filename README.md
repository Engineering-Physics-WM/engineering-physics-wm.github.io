# Engineering Physics Capstone · William & Mary

The public website for the William & Mary Engineering Physics Capstone program. Students can browse projects, rank preferences, and view the cohort dashboard.

**Live site:** [engineering-physics-wm.github.io](https://engineering-physics-wm.github.io)

## Structure

```
index.html          — single-page entry point
data/               — project data by cohort year (JSON)
js/                 — React components bundled by Vite
styles/             — CSS (design tokens, app layout, ranking, dashboard)
```

## Running locally

Install dependencies once:

```sh
npm install
```

Start the Vite dev server:

```sh
npm run dev
```

Build the static site:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

## Data

Project data lives in `data/<year>/`. See `data/schema.json` for the expected shape of each project entry.

## Supabase Polling

Copy `.env.example` to `.env.local` and add the Supabase publishable key for local development.

```sh
cp .env.example .env.local
```

Before turning on the live poll, run `supabase/schema.sql` in the Supabase SQL Editor. The GitHub Pages workflow reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from repository variables.

## Deployment

This repo is hosted on GitHub Pages. Push to `main` to run the Vite build workflow and deploy the generated `dist/` artifact.

In the GitHub repository settings, Pages should be configured to deploy from **GitHub Actions**.
