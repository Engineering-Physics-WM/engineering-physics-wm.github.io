---
name: project-ep-website
description: Context for the Engineering Physics Capstone website (ep.yangran.org) — tech stack, key files, conventions
metadata:
  type: project
---

William & Mary Engineering Physics Capstone site. Vite + React SPA deployed to GitHub Pages at ep.yangran.org.

**Why:** Public course operations tool for students, instructor (Ran Yang), and public visitors following capstone projects.

**Key files:**

- `js/app.jsx` — app shell, hash routing, Header, Footer
- `js/routes.js` — `hashForPage` / `parseHashToPage` helpers (exported, tested)
- `js/config.js` — `INSTRUCTOR_EMAIL`, `INSTRUCTOR_NAME` constants (single source)
- `js/data.js` — all cohort data: projects, announcements, years
- `js/ranking.jsx` — student project ranking poll page
- `js/auth.jsx` — Supabase auth gate (instructor only)
- `js/tweaks.jsx` — design tweaks panel (gated: dev only or `?tweaks=1`)
- `src/lib/rankingSubmissions.ts` — ranking submission logic + helpers
- `src/lib/supabaseClient.ts` — Supabase client

**Routing:** Hash-based via `history.pushState` + `popstate`. Routes: `#/` catalog, `#/updates` news, `#/ranking`, `#/dashboard`, `#/archive`.

**Supabase:** env vars `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` required for live polling and instructor dashboard. Set in GitHub repo vars for CI. RLS policies hardcode instructor email in SQL (cannot import from JS).

**How to apply:** When working on routing, header, ranking, or auth — check these files first. Instructor email (`rxyan2@wm.edu`) now lives in `js/config.js`; do not hardcode it elsewhere.
