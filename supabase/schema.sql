-- Engineering Physics Capstone ranking poll
-- Run this in Supabase Dashboard -> SQL Editor before enabling the live form.

create table if not exists public.ranking_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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

alter table public.ranking_submissions
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.ranking_allowed_students (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cohort_year text not null default '2026-2027',
  student_email text not null,
  student_email_normalized text generated always as (lower(student_email)) stored,
  student_name text,
  honors_project_id text,
  honors_project_number integer,
  honors_project_title text,
  constraint ranking_allowed_students_wm_email
    check (student_email ~* '^[^@[:space:]]+@wm\.edu$'),
  constraint ranking_allowed_students_unique_email
    unique (cohort_year, student_email_normalized)
);

alter table public.ranking_allowed_students
  add column if not exists honors_project_id text;

alter table public.ranking_allowed_students
  add column if not exists honors_project_number integer;

alter table public.ranking_allowed_students
  add column if not exists honors_project_title text;

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

create or replace function public.submit_ranking_submission(
  submit_cohort_year text,
  submit_student_name text,
  submit_student_email text,
  submit_ranking jsonb,
  submit_receipt_code text
)
returns table (
  submission_mode text,
  saved_receipt_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_email text := lower(trim(coalesce(submit_student_email, '')));
  clean_name text := trim(coalesce(submit_student_name, ''));
begin
  if clean_name = '' then
    raise exception 'Student name is required.' using errcode = '22023';
  end if;

  if clean_email !~* '^[^@[:space:]]+@wm\.edu$' then
    raise exception 'Use your William & Mary email address.' using errcode = '22023';
  end if;

  if jsonb_typeof(submit_ranking) is distinct from 'array'
    or jsonb_array_length(submit_ranking) <> 9 then
    raise exception 'Ranking must include every project.' using errcode = '22023';
  end if;

  if not public.is_ranking_student_allowed(submit_cohort_year, clean_email) then
    raise exception 'This email is not on the allowed student list for this cohort.' using errcode = '42501';
  end if;

  update public.ranking_submissions
  set student_name = clean_name,
      student_email = clean_email,
      notes = null,
      ranking = submit_ranking,
      receipt_code = submit_receipt_code,
      updated_at = now()
  where cohort_year = submit_cohort_year
    and lower(student_email) = clean_email;

  if found then
    return query select 'updated'::text, submit_receipt_code;
    return;
  end if;

  begin
    insert into public.ranking_submissions (
      cohort_year,
      student_name,
      student_email,
      notes,
      ranking,
      receipt_code
    )
    values (
      submit_cohort_year,
      clean_name,
      clean_email,
      null,
      submit_ranking,
      submit_receipt_code
    );

    return query select 'created'::text, submit_receipt_code;
  exception when unique_violation then
    update public.ranking_submissions
    set student_name = clean_name,
        student_email = clean_email,
        notes = null,
        ranking = submit_ranking,
        receipt_code = submit_receipt_code,
        updated_at = now()
    where cohort_year = submit_cohort_year
      and lower(student_email) = clean_email;

    if found then
      return query select 'updated'::text, submit_receipt_code;
      return;
    end if;

    raise;
  end;
end;
$$;

grant execute on function public.submit_ranking_submission(text, text, text, jsonb, text) to anon;

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

drop policy if exists "Students can edit rankings" on public.ranking_submissions;
create policy "Students can edit rankings"
on public.ranking_submissions
for update
to anon
using (
  student_email ~* '^[^@[:space:]]+@wm\.edu$'
  and public.is_ranking_student_allowed(
    ranking_submissions.cohort_year,
    ranking_submissions.student_email
  )
)
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

-- To populate the cohort allowlist, copy supabase/allowed-students-template.sql
-- into a private local SQL file, fill in real students, and run it in Supabase.
