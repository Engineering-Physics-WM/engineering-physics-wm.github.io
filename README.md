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

Project data lives in `data/<year>/`. See `data/schema.json` for the expected shape of each project entry. Student rosters, email lists, Honors defaults, and poll responses are not public site data; keep them in Supabase or ignored local files only.

Public cohort updates currently live in `js/data.js` as `announcements2026`. Files for announcement links can be placed in `public/announcements/<year>/` and linked as `/announcements/<year>/filename.pdf`. Editing this file updates the public site after commit/push/deploy; it does not automatically send email.

The protected dashboard has an **Email drafts** tab that can turn a news item or custom note into a `mailto:` draft for selected groups: all students + mentors, all students, Honors students, all mentors, selected team students + mentors, selected team students, or selected team mentors. Student recipients come from the private Supabase allowlist or saved teams, never from a checked-in public roster. This opens the default mail app with BCC recipients filled in; the instructor still reviews and sends the message manually.

The **Rewrite with AI** button is backed by `supabase/functions/rewrite-email`, so provider keys stay server-side. Deploy the function and set exactly one provider path:

```sh
supabase functions deploy rewrite-email

# OpenAI / ChatGPT option
supabase secrets set AI_EMAIL_PROVIDER=openai AI_EMAIL_MODEL=gpt-5 OPENAI_API_KEY=...

# Claude option
supabase secrets set AI_EMAIL_PROVIDER=anthropic AI_EMAIL_MODEL=claude-sonnet-4-20250514 ANTHROPIC_API_KEY=...

# Gemini option
supabase secrets set AI_EMAIL_PROVIDER=gemini AI_EMAIL_MODEL=gemini-2.5-flash GEMINI_API_KEY=...
```

Optional secrets: `AI_EMAIL_ALLOWED_USERS` defaults to `rxyan2@wm.edu`, and `AI_EMAIL_MAX_OUTPUT_TOKENS` defaults to `1200`.

## Supabase Polling

Copy `.env.example` to `.env.local` and add the Supabase publishable key for local development.

```sh
cp .env.example .env.local
```

Before turning on the live poll, run `supabase/schema.sql` in the Supabase SQL Editor. The GitHub Pages workflow reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from repository variables.

To limit submissions to enrolled students, copy `supabase/allowed-students-template.sql` to an ignored private file such as `supabase/allowed-students-2026-2027.private.sql`, fill in the real cohort, and run that private file in Supabase SQL Editor. The insert/update policies reject any email not on the private allowlist. Each student email has one saved response per cohort; submitting again with the same email edits that row. Optional `honors_project_*` columns let the matching dashboard lock Honors students to approved projects without exposing those defaults in the public build.

The instructor dashboard is protected with Supabase email/password auth. In Supabase, create a confirmed Auth user for `rxyan2@wm.edu` with the dashboard password. The app does not expose public sign-up; only that email can pass the dashboard gate. After login, the dashboard reads live `ranking_submissions`, the private `ranking_allowed_students` allowlist, and saved `cohort_team_members`. Dashboard views are filtered to the active allowlist and current responses, so removed test students do not linger in charts or saved team previews.

For a Supabase-backed announcement system, run `supabase/announcements-schema.sql`. Public published announcements can be read by anyone; draft/edit/send-job access stays limited to `rxyan2@wm.edu`. The current repo only defines the announcement and email-job tables; actual email delivery still needs a Supabase Edge Function or other trusted backend with a private email-provider API key.

For saved final team assignments, run `supabase/team-assignments-schema.sql`. The dashboard team page can analyze live poll responses, auto-match teams, drag students between projects, and save the final roster to `cohort_team_members`; team email groups use those saved rows when they exist, otherwise they fall back to the current auto-match preview.

## Deployment

This repo is hosted on GitHub Pages. Push to `main` to run the Vite build workflow and deploy the generated `dist/` artifact.

In the GitHub repository settings, Pages should be configured to deploy from **GitHub Actions**.
