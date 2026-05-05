# Engineering Physics Capstone · William & Mary

The public website for the William & Mary Engineering Physics Capstone program. Students can browse projects, rank preferences, and view the cohort dashboard.

**Live site:** [engineering-physics-wm.github.io](https://engineering-physics-wm.github.io)

## Structure

```
index.html          — single-page entry point
data/               — project data by cohort year (JSON)
js/                 — React components (transpiled in-browser via Babel)
styles/             — CSS (design tokens, app layout, ranking, dashboard)
```

## Running locally

Open `index.html` directly in a browser — no build step required. The site uses React 18 and Babel loaded from CDN, so all JSX is transpiled client-side.

> Note: some browsers block local file fetches. If data doesn't load, serve the directory with any static file server:
> ```
> npx serve .
> ```

## Data

Project data lives in `data/<year>/`. See `data/schema.json` for the expected shape of each project entry.

## Deployment

This repo is hosted on GitHub Pages. Push to `main` to deploy.
