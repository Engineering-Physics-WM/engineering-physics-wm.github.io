-- Pitch Perfect II in-class investor round.
-- Run this once in Supabase Dashboard -> SQL Editor before class.
-- Safe to re-run: existing responses and the current open/closed state are kept.
-- Requires public.is_ranking_student_allowed from allowlist-migration.sql (already live).

create table if not exists public.pitch_investment_rounds (
  round_id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cohort_year text not null,
  title text not null,
  is_open boolean not null default true,
  budget integer not null default 1000000,
  project_ids text[] not null,
  constraint pitch_investment_rounds_budget_positive check (budget > 0),
  constraint pitch_investment_rounds_has_projects check (cardinality(project_ids) > 0)
);

insert into public.pitch_investment_rounds (
  round_id,
  cohort_year,
  title,
  is_open,
  budget,
  project_ids
)
values (
  'pitch-perfect-ii-2026',
  '2026-2027',
  'Pitch Perfect II',
  true,
  1000000,
  array[
    'animal-crossing',
    'smr-heat-load',
    'irays-pupillometry',
    'usv-race-boat',
    'laser-optics',
    'soft-bio-robot'
  ]
)
on conflict (round_id) do update
set
  cohort_year = excluded.cohort_year,
  title = excluded.title,
  budget = excluded.budget,
  project_ids = excluded.project_ids,
  updated_at = now();

create table if not exists public.pitch_investments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  round_id text not null references public.pitch_investment_rounds (round_id) on delete cascade,
  student_name text not null,
  student_email text not null,
  allocations jsonb not null,
  total_invested integer not null,
  constraint pitch_investments_wm_email check (student_email ~* '^[^@[:space:]]+@wm\.edu$'),
  constraint pitch_investments_lowercase_email check (student_email = lower(student_email)),
  constraint pitch_investments_allocations_object check (jsonb_typeof(allocations) = 'object'),
  constraint pitch_investments_total_range check (total_invested between 0 and 1000000),
  constraint pitch_investments_one_per_student unique (round_id, student_email)
);

alter table public.pitch_investment_rounds enable row level security;
alter table public.pitch_investments enable row level security;

-- Students never read or write these tables directly. They go through the functions below.
drop policy if exists "Instructor can manage pitch investment rounds" on public.pitch_investment_rounds;
create policy "Instructor can manage pitch investment rounds"
on public.pitch_investment_rounds
for all
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'))
with check ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));

drop policy if exists "Instructor can read pitch investments" on public.pitch_investments;
create policy "Instructor can read pitch investments"
on public.pitch_investments
for select
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));

drop policy if exists "Instructor can delete pitch investments" on public.pitch_investments;
create policy "Instructor can delete pitch investments"
on public.pitch_investments
for delete
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));

create or replace function public.get_pitch_investment_round(
  check_round_id text
)
returns table (
  round_id text,
  cohort_year text,
  title text,
  is_open boolean,
  budget integer,
  project_ids text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select r.round_id, r.cohort_year, r.title, r.is_open, r.budget, r.project_ids
  from public.pitch_investment_rounds r
  where r.round_id = check_round_id;
$$;

grant execute on function public.get_pitch_investment_round(text) to anon, authenticated;

create or replace function public.submit_pitch_investment(
  submit_round_id text,
  submit_student_name text,
  submit_student_email text,
  submit_allocations jsonb
)
returns table (
  submission_mode text,
  saved_total integer,
  saved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  clean_email text := lower(trim(coalesce(submit_student_email, '')));
  clean_name text := trim(coalesce(submit_student_name, ''));
  round_row public.pitch_investment_rounds%rowtype;
  clean_allocations jsonb := '{}'::jsonb;
  entry record;
  amount numeric;
  running_total numeric := 0;
  listed_project text;
  was_inserted boolean;
  saved_time timestamptz;
begin
  select * into round_row
  from public.pitch_investment_rounds r
  where r.round_id = submit_round_id;

  if not found then
    raise exception 'This investment round is not set up yet.' using errcode = '22023';
  end if;

  if not round_row.is_open then
    raise exception 'Investing is closed for this round.' using errcode = '42501';
  end if;

  if clean_name = '' then
    raise exception 'Your name is required.' using errcode = '22023';
  end if;

  if clean_email !~* '^[^@[:space:]]+@wm\.edu$' then
    raise exception 'Use your William & Mary email address.' using errcode = '22023';
  end if;

  if not public.is_ranking_student_allowed(round_row.cohort_year, clean_email) then
    raise exception 'This email is not on the class list for this cohort.' using errcode = '42501';
  end if;

  if jsonb_typeof(submit_allocations) is distinct from 'object' then
    raise exception 'Investments must be sent as project amounts.' using errcode = '22023';
  end if;

  for entry in select key, value from jsonb_each(submit_allocations) loop
    if not (entry.key = any (round_row.project_ids)) then
      raise exception 'Unknown project: %', entry.key using errcode = '22023';
    end if;

    if jsonb_typeof(entry.value) is distinct from 'number' then
      raise exception 'Each investment must be a number.' using errcode = '22023';
    end if;

    amount := (entry.value #>> '{}')::numeric;

    if amount < 0 or amount > round_row.budget or amount <> trunc(amount) then
      raise exception 'Each investment must be a whole-dollar amount from $0 to %.',
        to_char(round_row.budget, 'FM$9,999,999') using errcode = '22023';
    end if;

    running_total := running_total + amount;
    clean_allocations := clean_allocations || jsonb_build_object(entry.key, amount);
  end loop;

  foreach listed_project in array round_row.project_ids loop
    if not (clean_allocations ? listed_project) then
      clean_allocations := clean_allocations || jsonb_build_object(listed_project, 0);
    end if;
  end loop;

  if running_total > round_row.budget then
    raise exception 'Your total of % is more than your % budget.',
      to_char(running_total, 'FM$9,999,999'),
      to_char(round_row.budget, 'FM$9,999,999') using errcode = '22023';
  end if;

  insert into public.pitch_investments (
    round_id,
    student_name,
    student_email,
    allocations,
    total_invested
  )
  values (
    round_row.round_id,
    clean_name,
    clean_email,
    clean_allocations,
    running_total::integer
  )
  on conflict (round_id, student_email) do update
  set
    student_name = excluded.student_name,
    allocations = excluded.allocations,
    total_invested = excluded.total_invested,
    updated_at = now()
  returning (xmax = 0), updated_at into was_inserted, saved_time;

  return query
  select
    case when was_inserted then 'created' else 'updated' end,
    running_total::integer,
    saved_time;
end;
$$;

grant execute on function public.submit_pitch_investment(text, text, text, jsonb) to anon, authenticated;

-- In class, open or close investing from the instructor results page, or run:
-- update public.pitch_investment_rounds set is_open = false, updated_at = now()
-- where round_id = 'pitch-perfect-ii-2026';
