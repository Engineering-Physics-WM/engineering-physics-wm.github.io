-- Add an email allowlist to the existing ranking poll database.
-- Run this once in Supabase Dashboard -> SQL Editor.

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

alter table public.ranking_allowed_students enable row level security;

drop policy if exists "Students can submit rankings" on public.ranking_submissions;
create policy "Students can submit rankings"
on public.ranking_submissions
for insert
to anon
with check (
  student_email ~* '^[^@[:space:]]+@wm\.edu$'
  and jsonb_typeof(ranking) = 'array'
  and jsonb_array_length(ranking) = 9
  and exists (
    select 1
    from public.ranking_allowed_students allowed
    where allowed.cohort_year = ranking_submissions.cohort_year
      and allowed.student_email_normalized = lower(ranking_submissions.student_email)
  )
);

drop policy if exists "Instructor can manage allowed students" on public.ranking_allowed_students;
create policy "Instructor can manage allowed students"
on public.ranking_allowed_students
for all
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'))
with check ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));

-- After running the migration above, replace these placeholder rows with the
-- 17 allowed student emails and run the insert block.
--
-- insert into public.ranking_allowed_students (cohort_year, student_email, student_name)
-- values
--   ('2026-2027', 'student1@wm.edu', 'Student One'),
--   ('2026-2027', 'student2@wm.edu', 'Student Two')
-- on conflict on constraint ranking_allowed_students_unique_email do update
-- set student_name = excluded.student_name;
