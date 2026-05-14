-- Fix ranking poll resubmits so one student email always updates the same row.
-- Run this in Supabase Dashboard -> SQL Editor.

alter table public.ranking_submissions
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.ranking_poll_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cohort_year text not null unique,
  is_open boolean not null default true,
  closes_at timestamptz,
  closed_message text not null default 'The ranking poll closed on Wednesday, May 13 at 4:00 PM.'
);

insert into public.ranking_poll_settings (
  cohort_year,
  is_open,
  closes_at,
  closed_message
)
values (
  '2026-2027',
  false,
  '2026-05-13 16:00:00-04',
  'The ranking poll closed on Wednesday, May 13 at 4:00 PM.'
)
on conflict (cohort_year) do update
set
  is_open = excluded.is_open,
  closes_at = excluded.closes_at,
  closed_message = excluded.closed_message,
  updated_at = now();

alter table public.ranking_poll_settings enable row level security;

create or replace function public.is_ranking_poll_open(
  check_cohort_year text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select settings.is_open
      and (
        settings.closes_at is null
        or now() < settings.closes_at
      )
    from public.ranking_poll_settings settings
    where settings.cohort_year = check_cohort_year
  ), true);
$$;

grant execute on function public.is_ranking_poll_open(text) to anon;

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

  if not public.is_ranking_poll_open(submit_cohort_year) then
    raise exception 'The ranking poll closed on Wednesday, May 13 at 4:00 PM.' using errcode = '42501';
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
  and public.is_ranking_poll_open(ranking_submissions.cohort_year)
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
  and public.is_ranking_poll_open(ranking_submissions.cohort_year)
  and public.is_ranking_student_allowed(
    ranking_submissions.cohort_year,
    ranking_submissions.student_email
  )
)
with check (
  student_email ~* '^[^@[:space:]]+@wm\.edu$'
  and public.is_ranking_poll_open(ranking_submissions.cohort_year)
  and jsonb_typeof(ranking) = 'array'
  and jsonb_array_length(ranking) = 9
  and public.is_ranking_student_allowed(
    ranking_submissions.cohort_year,
    ranking_submissions.student_email
  )
);

drop policy if exists "Instructor can manage ranking poll settings" on public.ranking_poll_settings;
create policy "Instructor can manage ranking poll settings"
on public.ranking_poll_settings
for all
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'))
with check ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));
