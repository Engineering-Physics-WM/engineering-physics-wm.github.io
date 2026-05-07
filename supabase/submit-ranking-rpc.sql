-- Fix ranking poll resubmits so one student email always updates the same row.
-- Run this in Supabase Dashboard -> SQL Editor.

alter table public.ranking_submissions
  add column if not exists updated_at timestamptz not null default now();

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
