-- Yang Ran Angels, the EP classroom investor game (starts at Pitch Perfect II, continues through later pitches and progress reports).
-- Each student logs in with their first name and a preset password, and keeps one $1M portfolio
-- for the whole year. The page saves every change instantly, and each change is written to an activity log
-- for the instructor. Investments move in $10,000 steps.
--
-- Setup, in Supabase Dashboard -> SQL Editor:
--   1. Run this file. Safe to re-run: players, portfolios, history, and settings are kept.
--   2. Run the private seed file supabase/investor-game-players-2026-2027.private.sql (not in git).
--
-- Who can see what:
--   * Students (anon) reach only their own portfolio, through the functions below.
--   * The public totals function returns one total per team, nothing per student.
--   * Only the instructor account can read players, the activity log, or change settings.

create extension if not exists pgcrypto with schema extensions;

-- Remove functions from an earlier draft of this game, if they were ever created.
drop function if exists public.submit_pitch_investment(text, text, text, jsonb);
drop function if exists public.get_pitch_investment_round(text);

create table if not exists public.investor_games (
  game_id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cohort_year text not null,
  title text not null,
  is_open boolean not null default true,
  totals_visible boolean not null default true,
  current_event text not null default 'Pitch Perfect II',
  budget integer not null default 1000000,
  project_ids text[] not null,
  constraint investor_games_budget_positive check (budget > 0),
  constraint investor_games_has_projects check (cardinality(project_ids) > 0),
  constraint investor_games_event_length check (char_length(current_event) between 1 and 60)
);

insert into public.investor_games (game_id, cohort_year, title, current_event, budget, project_ids)
values (
  'ep-investor-2026-2027',
  '2026-2027',
  'Yang Ran Angels',
  'Pitch Perfect II',
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
on conflict (game_id) do update
set
  cohort_year = excluded.cohort_year,
  title = excluded.title,
  budget = excluded.budget,
  project_ids = excluded.project_ids,
  updated_at = now();

create table if not exists public.investor_game_players (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  game_id text not null references public.investor_games (game_id) on delete cascade,
  display_name text not null,
  name_key text not null,
  password_hash text not null,
  session_token uuid not null default gen_random_uuid(),
  team_project_id text,
  is_practice boolean not null default false,
  allocations jsonb not null default '{}'::jsonb,
  total_invested integer not null default 0,
  last_saved_at timestamptz,
  failed_login_attempts integer not null default 0,
  locked_until timestamptz,
  constraint investor_game_players_name_length check (char_length(display_name) between 1 and 40),
  constraint investor_game_players_team_required check (is_practice or team_project_id is not null),
  constraint investor_game_players_allocations_object check (jsonb_typeof(allocations) = 'object'),
  constraint investor_game_players_total_range check (total_invested between 0 and 1000000),
  constraint investor_game_players_unique_name unique (game_id, name_key),
  constraint investor_game_players_unique_token unique (session_token)
);

create table if not exists public.investor_game_activity (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  game_id text not null references public.investor_games (game_id) on delete cascade,
  player_id uuid not null references public.investor_game_players (id) on delete cascade,
  event_label text not null,
  allocations_before jsonb not null,
  allocations_after jsonb not null,
  total_before integer not null,
  total_after integer not null
);

create index if not exists investor_game_activity_recent
  on public.investor_game_activity (game_id, created_at desc);

alter table public.investor_games enable row level security;
alter table public.investor_game_players enable row level security;
alter table public.investor_game_activity enable row level security;

drop policy if exists "Instructor can manage investor games" on public.investor_games;
create policy "Instructor can manage investor games"
on public.investor_games
for all
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'))
with check ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));

drop policy if exists "Instructor can read investor game players" on public.investor_game_players;
create policy "Instructor can read investor game players"
on public.investor_game_players
for select
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));

drop policy if exists "Instructor can remove investor game players" on public.investor_game_players;
create policy "Instructor can remove investor game players"
on public.investor_game_players
for delete
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));

drop policy if exists "Instructor can read investor game activity" on public.investor_game_activity;
create policy "Instructor can read investor game activity"
on public.investor_game_activity
for select
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));

-- Game status -------------------------------------------------------------------

create or replace function public.investor_game_status(
  p_game_id text
)
returns table (
  game_id text,
  cohort_year text,
  title text,
  is_open boolean,
  totals_visible boolean,
  current_event text,
  budget integer,
  project_ids text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select g.game_id, g.cohort_year, g.title, g.is_open, g.totals_visible, g.current_event, g.budget, g.project_ids
  from public.investor_games g
  where g.game_id = p_game_id;
$$;

grant execute on function public.investor_game_status(text) to anon, authenticated;

-- Log in -------------------------------------------------------------------------
-- status: ok | wrong (unknown name or wrong password) | locked (5 misses, wait 2 minutes)

create or replace function public.investor_game_login(
  p_game_id text,
  p_name text,
  p_password text
)
returns table (
  status text,
  player_name text,
  team_project_id text,
  is_practice boolean,
  session_token uuid,
  allocations jsonb,
  saved_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  player public.investor_game_players%rowtype;
  name_key_value text := lower(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'));
  clean_password text := trim(coalesce(p_password, ''));
begin
  perform 1 from public.investor_games g where g.game_id = p_game_id;
  if not found then
    raise exception 'The investor game is not set up yet.' using errcode = '22023';
  end if;

  select * into player
  from public.investor_game_players pl
  where pl.game_id = p_game_id
    and pl.name_key = name_key_value;

  if not found then
    return query select 'wrong'::text, null::text, null::text, null::boolean, null::uuid, null::jsonb, null::timestamptz;
    return;
  end if;

  if player.locked_until is not null and player.locked_until > now() then
    return query select 'locked'::text, null::text, null::text, null::boolean, null::uuid, null::jsonb, null::timestamptz;
    return;
  end if;

  if player.password_hash = crypt(clean_password, player.password_hash) then
    update public.investor_game_players pl
    set failed_login_attempts = 0,
        locked_until = null
    where pl.id = player.id;

    return query select
      'ok'::text,
      player.display_name,
      player.team_project_id,
      player.is_practice,
      player.session_token,
      player.allocations,
      player.last_saved_at;
    return;
  end if;

  -- Return a status instead of raising, so the failed attempt is actually recorded.
  update public.investor_game_players pl
  set failed_login_attempts = case when pl.failed_login_attempts + 1 >= 5 then 0 else pl.failed_login_attempts + 1 end,
      locked_until = case when pl.failed_login_attempts + 1 >= 5 then now() + interval '2 minutes' else null end
  where pl.id = player.id;

  return query select 'wrong'::text, null::text, null::text, null::boolean, null::uuid, null::jsonb, null::timestamptz;
end;
$$;

grant execute on function public.investor_game_login(text, text, text) to anon, authenticated;

-- Restore a login on page reload ------------------------------------------------

create or replace function public.investor_game_session(
  p_game_id text,
  p_session_token uuid
)
returns table (
  player_name text,
  team_project_id text,
  is_practice boolean,
  allocations jsonb,
  saved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select pl.display_name, pl.team_project_id, pl.is_practice, pl.allocations, pl.last_saved_at
  from public.investor_game_players pl
  where pl.game_id = p_game_id
    and pl.session_token = p_session_token;
$$;

grant execute on function public.investor_game_session(text, uuid) to anon, authenticated;

-- Save a portfolio (and log the change) ---------------------------------------------

create or replace function public.investor_game_save(
  p_game_id text,
  p_session_token uuid,
  p_allocations jsonb
)
returns table (
  saved_total integer,
  saved_at timestamptz,
  changed boolean
)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  game_row public.investor_games%rowtype;
  player public.investor_game_players%rowtype;
  clean_allocations jsonb := '{}'::jsonb;
  entry record;
  amount numeric;
  running_total numeric := 0;
  listed_project text;
  saved_time timestamptz := now();
begin
  select * into game_row from public.investor_games g where g.game_id = p_game_id;
  if not found then
    raise exception 'The investor game is not set up yet.' using errcode = '22023';
  end if;

  select * into player
  from public.investor_game_players pl
  where pl.game_id = game_row.game_id
    and pl.session_token = p_session_token;

  if not found then
    raise exception 'Your session ended. Log in again with your first name and password.' using errcode = '28000';
  end if;

  if not game_row.is_open then
    raise exception 'Investing is closed right now.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_allocations) is distinct from 'object' then
    raise exception 'Investments must be sent as team amounts.' using errcode = '22023';
  end if;

  for entry in select key, value from jsonb_each(p_allocations) loop
    if not (entry.key = any (game_row.project_ids)) then
      raise exception 'Unknown team: %', entry.key using errcode = '22023';
    end if;

    if jsonb_typeof(entry.value) is distinct from 'number' then
      raise exception 'Each investment must be a number.' using errcode = '22023';
    end if;

    amount := (entry.value #>> '{}')::numeric;

    if amount < 0 or amount > game_row.budget or amount <> trunc(amount) then
      raise exception 'Each investment must be a whole-dollar amount from $0 to %.',
        to_char(game_row.budget, 'FM$9,999,999') using errcode = '22023';
    end if;

    if amount > 0 and entry.key = player.team_project_id then
      raise exception 'You cannot invest in your own team.' using errcode = '42501';
    end if;

    if mod(amount, 10000) <> 0 then
      raise exception 'Investments go in $10,000 steps.' using errcode = '22023';
    end if;

    running_total := running_total + amount;
    clean_allocations := clean_allocations || jsonb_build_object(entry.key, amount::bigint);
  end loop;

  foreach listed_project in array game_row.project_ids loop
    if not (clean_allocations ? listed_project) then
      clean_allocations := clean_allocations || jsonb_build_object(listed_project, 0);
    end if;
  end loop;

  if running_total > game_row.budget then
    raise exception 'Your total of % is more than your % budget.',
      to_char(running_total, 'FM$9,999,999'),
      to_char(game_row.budget, 'FM$9,999,999') using errcode = '22023';
  end if;

  if clean_allocations = player.allocations then
    return query select player.total_invested, player.last_saved_at, false;
    return;
  end if;

  update public.investor_game_players pl
  set allocations = clean_allocations,
      total_invested = running_total::integer,
      last_saved_at = saved_time,
      updated_at = saved_time
  where pl.id = player.id;

  insert into public.investor_game_activity (
    game_id,
    player_id,
    event_label,
    allocations_before,
    allocations_after,
    total_before,
    total_after
  )
  values (
    game_row.game_id,
    player.id,
    game_row.current_event,
    player.allocations,
    clean_allocations,
    player.total_invested,
    running_total::integer
  );

  return query select running_total::integer, saved_time, true;
end;
$$;

grant execute on function public.investor_game_save(text, uuid, jsonb) to anon, authenticated;

-- Public totals: one number per team, nothing per student -----------------------------

create or replace function public.investor_game_public_totals(
  p_game_id text
)
returns table (
  project_id text,
  total_raised bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select u.pid, coalesce(sum((pl.allocations ->> u.pid)::bigint), 0)::bigint
  from public.investor_games g
  cross join lateral unnest(g.project_ids) as u(pid)
  left join public.investor_game_players pl
    on pl.game_id = g.game_id
   and not pl.is_practice
  where g.game_id = p_game_id
    and g.totals_visible
  group by u.pid;
$$;

grant execute on function public.investor_game_public_totals(text) to anon, authenticated;

-- Instructor tools: reset a password or correct a student's team -------------------------

create or replace function public.investor_game_admin_update_player(
  p_player_id uuid,
  p_new_password text default null,
  p_team_project_id text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  player public.investor_game_players%rowtype;
  game_row public.investor_games%rowtype;
  clean_password text := trim(coalesce(p_new_password, ''));
  moved_amount integer;
begin
  if coalesce(auth.jwt() ->> 'email', '') not in ('rxyan2@wm.edu') then
    raise exception 'Only the instructor can change students.' using errcode = '42501';
  end if;

  select * into player from public.investor_game_players pl where pl.id = p_player_id;
  if not found then
    raise exception 'Student not found.' using errcode = '22023';
  end if;

  select * into game_row from public.investor_games g where g.game_id = player.game_id;

  if p_new_password is not null then
    if char_length(clean_password) < 3 or char_length(clean_password) > 64 then
      raise exception 'The new password needs 3 to 64 characters.' using errcode = '22023';
    end if;

    -- A new session token signs the student out on every device.
    update public.investor_game_players pl
    set password_hash = crypt(clean_password, gen_salt('bf', 8)),
        session_token = gen_random_uuid(),
        failed_login_attempts = 0,
        locked_until = null,
        updated_at = now()
    where pl.id = player.id;
  end if;

  if p_team_project_id is not null then
    if not (p_team_project_id = any (game_row.project_ids)) then
      raise exception 'Pick a team from the list.' using errcode = '22023';
    end if;

    moved_amount := coalesce((player.allocations ->> p_team_project_id)::integer, 0);

    -- Money already in the new team goes back to the student's wallet, and the change is logged.
    update public.investor_game_players pl
    set team_project_id = p_team_project_id,
        is_practice = false,
        total_invested = pl.total_invested - moved_amount,
        allocations = pl.allocations || jsonb_build_object(p_team_project_id, 0),
        updated_at = now()
    where pl.id = player.id;

    if moved_amount > 0 then
      insert into public.investor_game_activity (
        game_id, player_id, event_label, allocations_before, allocations_after, total_before, total_after
      )
      values (
        player.game_id,
        player.id,
        'Team changed by instructor',
        player.allocations,
        player.allocations || jsonb_build_object(p_team_project_id, 0),
        player.total_invested,
        player.total_invested - moved_amount
      );
    end if;
  end if;
end;
$$;

revoke all on function public.investor_game_admin_update_player(uuid, text, text) from public, anon;
grant execute on function public.investor_game_admin_update_player(uuid, text, text) to authenticated;
