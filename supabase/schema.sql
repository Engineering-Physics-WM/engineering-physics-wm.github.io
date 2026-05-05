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

create table if not exists public.ranking_allowed_students (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cohort_year text not null default '2026-2027',
  student_email text not null,
  student_email_normalized text generated always as (lower(student_email)) stored,
  student_name text,
  constraint ranking_allowed_students_wm_email
    check (student_email ~* '^[^@[:space:]]+@wm\.edu$'),
  constraint ranking_allowed_students_unique_email
    unique (cohort_year, student_email_normalized)
);

create unique index if not exists ranking_one_response_per_student
on public.ranking_submissions (cohort_year, lower(student_email));

alter table public.ranking_submissions enable row level security;
alter table public.ranking_allowed_students enable row level security;

create or replace function public.is_ranking_student_allowed(
  check_cohort_year text,
  check_student_email text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ranking_allowed_students allowed
    where allowed.cohort_year = check_cohort_year
      and allowed.student_email_normalized = lower(check_student_email)
  );
$$;

grant execute on function public.is_ranking_student_allowed(text, text) to anon;

drop policy if exists "Students can submit rankings" on public.ranking_submissions;
create policy "Students can submit rankings"
on public.ranking_submissions
for insert
to anon
with check (
  student_email ~* '^[^@[:space:]]+@wm\.edu$'
  and jsonb_typeof(ranking) = 'array'
  and jsonb_array_length(ranking) = 9
  and public.is_ranking_student_allowed(
    ranking_submissions.cohort_year,
    ranking_submissions.student_email
  )
);

drop policy if exists "Instructor can read rankings" on public.ranking_submissions;
create policy "Instructor can read rankings"
on public.ranking_submissions
for select
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));

drop policy if exists "Instructor can manage allowed students" on public.ranking_allowed_students;
create policy "Instructor can manage allowed students"
on public.ranking_allowed_students
for all
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'))
with check ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));

-- To populate the cohort allowlist, run supabase/allowed-students-2026-2027.sql.
