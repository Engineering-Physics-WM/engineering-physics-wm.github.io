-- Populate the 2026-2027 Engineering Physics ranking allowlist.
-- Run supabase/allowlist-migration.sql first, then run this file in Supabase SQL Editor.

insert into public.ranking_allowed_students (cohort_year, student_email, student_name)
values
  ('2026-2027', 'etucker@wm.edu', 'Evelyn Tucker'),
  ('2026-2027', 'cjbandekow@wm.edu', 'Charlotte Bandekow'),
  ('2026-2027', 'kmmiles@wm.edu', 'Kamila Miles'),
  ('2026-2027', 'jye03@wm.edu', 'Jingyuan Ye'),
  ('2026-2027', 'saneeley@wm.edu', 'Solana Neeley'),
  ('2026-2027', 'foddssoncricco@wm.edu', 'Finnur Oddsson Cricco'),
  ('2026-2027', 'wfdeluna@wm.edu', 'Richie De Luna'),
  ('2026-2027', 'bdstobie@wm.edu', 'Brandon Stobie'),
  ('2026-2027', 'eeverhart@wm.edu', 'Elisabeth Everhart'),
  ('2026-2027', 'mphajasz@wm.edu', 'Michael Hajasz'),
  ('2026-2027', 'ndmiller@wm.edu', 'Nick Miller'),
  ('2026-2027', 'jehempel@wm.edu', 'Joss Hempel'),
  ('2026-2027', 'swmorefield@wm.edu', 'Scott Morefield'),
  ('2026-2027', 'infabris@wm.edu', 'Ian Fabris'),
  ('2026-2027', 'rwsublett@wm.edu', 'Ryan Sublett'),
  ('2026-2027', 'hcgreene@wm.edu', 'Hayden Greene'),
  ('2026-2027', 'aywang03@wm.edu', 'Andrew Wang')
on conflict on constraint ranking_allowed_students_unique_email do update
set student_name = excluded.student_name;
