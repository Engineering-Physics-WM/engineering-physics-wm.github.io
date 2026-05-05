-- Engineering Physics Capstone ranking poll
-- Run this in Supabase Dashboard -> SQL Editor before enabling the live form.

create table if not exists public.ranking_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cohort_year text not null default '2026-2027',
  student_name text not null,
  student_email text not null,
  notes text,
  ranking jsonb not null,
  receipt_code text not null,
  constraint ranking_submissions_wm_email
    check (student_email ~* '^[^@[:space:]]+@wm\.edu$'),
  constraint ranking_submissions_ranking_array
    check (jsonb_typeof(ranking) = 'array' and jsonb_array_length(ranking) = 9)
);

create unique index if not exists ranking_one_response_per_student
on public.ranking_submissions (cohort_year, lower(student_email));

alter table public.ranking_submissions enable row level security;

drop policy if exists "Students can submit rankings" on public.ranking_submissions;
create policy "Students can submit rankings"
on public.ranking_submissions
for insert
to anon
with check (
  student_email ~* '^[^@[:space:]]+@wm\.edu$'
  and jsonb_typeof(ranking) = 'array'
  and jsonb_array_length(ranking) = 9
);

drop policy if exists "Instructor can read rankings" on public.ranking_submissions;
create policy "Instructor can read rankings"
on public.ranking_submissions
for select
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));
