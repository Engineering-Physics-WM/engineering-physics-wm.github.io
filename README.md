# Capstone site data

This folder contains a static website and website-ready JSON extracted from the
spreadsheet.

## Files

- `index.html`, `styles.css`, and `app.js` make the project browser and ranking
  workspace.
- `projects.json` contains the top-level index for listings.
- `projects/<slug>.json` contains one full record per project.
- `schema.json` documents the field layout.
- `assets/cohort-map.svg` is the cohort visualization used on the homepage.

## Running locally

Because the browser loads project data with `fetch()`, serve the folder over
HTTP instead of opening `index.html` directly from the filesystem:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Suggested static site flow

1. Load `projects.json` on the homepage.
2. Render each item as a card or table row.
3. Link each item to `/projects/<slug>.html` or a client-side route.
4. On the detail page, fetch `projects/<slug>.json`.

## Survey collection

The current site is fully static. It can help students draft and export project
rankings, but it cannot securely store submissions by itself. For collection,
connect the ranking flow to Google Forms, Qualtrics, Google Sheets Apps Script,
Netlify Forms, Formspree, Firebase, or Supabase.

## Notes

- Long text fields preserve paragraph breaks.
- The co-advisor field is kept as raw text because entries are free-form.
