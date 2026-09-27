begin;

-- Yang Ran Angels: dated investment sessions for every Yang-only class.
-- Each student logs in with their first name and a preset password, and keeps one $1M portfolio
-- for the whole year. The page saves every change instantly, and each change is written to an activity log
-- for the instructor. Investments move in $10,000 steps. Students get $1M each; an
-- instructor account can have its own budget.
--
-- Setup, in Supabase Dashboard -> SQL Editor:
--   1. Run this file. Safe to re-run: players, portfolios, history, and settings are kept.
--   2. Run the private seed file supabase/investor-game-players-2026-2027.private.sql (not in git).
--
-- Who can see what:
--   * Angels use token-scoped functions for their portfolio, archive, and private feedback.
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
  is_instructor boolean not null default false,
  budget integer not null default 1000000,
  allocations jsonb not null default '{}'::jsonb,
  total_invested integer not null default 0,
  last_saved_at timestamptz,
  failed_login_attempts integer not null default 0,
  locked_until timestamptz,
  constraint investor_game_players_name_length check (char_length(display_name) between 1 and 40),
  constraint investor_game_players_team_required check (is_practice or is_instructor or team_project_id is not null),
  constraint investor_game_players_allocations_object check (jsonb_typeof(allocations) = 'object'),
  constraint investor_game_players_budget_positive check (budget > 0),
  constraint investor_game_players_total_range check (total_invested between 0 and budget),
  constraint investor_game_players_unique_name unique (game_id, name_key),
  constraint investor_game_players_unique_token unique (session_token)
);

-- Bring tables created by an earlier version of this script up to date.
alter table public.investor_game_players add column if not exists is_instructor boolean not null default false;
alter table public.investor_game_players add column if not exists budget integer not null default 1000000;
alter table public.investor_game_players drop constraint if exists investor_game_players_team_required;
alter table public.investor_game_players add constraint investor_game_players_team_required
  check (is_practice or is_instructor or team_project_id is not null);
alter table public.investor_game_players drop constraint if exists investor_game_players_budget_positive;
alter table public.investor_game_players add constraint investor_game_players_budget_positive check (budget > 0);
alter table public.investor_game_players drop constraint if exists investor_game_players_total_range;
alter table public.investor_game_players add constraint investor_game_players_total_range
  check (total_invested between 0 and budget);

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

-- Dated sessions use America/New_York, including daylight-saving transitions.
alter table public.investor_game_players add column if not exists is_active boolean not null default true;
alter table public.investor_game_players add column if not exists spring_bonus_at timestamptz;
alter table public.investor_games add column if not exists archive_started_at timestamptz not null default now();

create table if not exists public.investor_game_events (
  id text primary key,
  game_id text not null references public.investor_games(game_id),
  label text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  finalized_at timestamptz,
  check (ends_at > starts_at)
);
create index if not exists investor_events_by_game on public.investor_game_events(game_id, starts_at);
create table if not exists public.investor_game_results (
  event_id text not null references public.investor_game_events(id),
  player_id uuid not null references public.investor_game_players(id),
  player_name text not null,
  team_project_id text,
  is_practice boolean not null,
  is_instructor boolean not null,
  budget integer not null,
  allocations jsonb not null,
  total_invested integer not null,
  primary key(event_id, player_id)
);
create table if not exists public.investor_game_comments (
  id bigint generated always as identity primary key,
  event_id text not null references public.investor_game_events(id),
  player_id uuid not null references public.investor_game_players(id),
  player_name text not null,
  project_id text not null,
  body text not null check (char_length(body) between 1 and 500),
  updated_at timestamptz not null default now(),
  unique(event_id, player_id, project_id)
);

alter table public.investor_game_activity add column if not exists player_name text;
alter table public.investor_game_activity add column if not exists team_project_id text;
update public.investor_game_activity a set player_name = p.display_name, team_project_id = p.team_project_id
from public.investor_game_players p where a.player_id = p.id and a.player_name is null;
-- Archiving a login must never delete its portfolio history.
alter table public.investor_game_activity drop constraint if exists investor_game_activity_player_id_fkey;
alter table public.investor_game_activity add constraint investor_game_activity_player_id_fkey
  foreign key(player_id) references public.investor_game_players(id);
drop policy if exists "Instructor can remove investor game players" on public.investor_game_players;

alter table public.investor_game_events enable row level security;
alter table public.investor_game_results enable row level security;
alter table public.investor_game_comments enable row level security;
drop policy if exists "Instructor reads events" on public.investor_game_events;
create policy "Instructor reads events" on public.investor_game_events for select to authenticated
  using ((auth.jwt() ->> 'email') = 'rxyan2@wm.edu');
drop policy if exists "Instructor reads results" on public.investor_game_results;
create policy "Instructor reads results" on public.investor_game_results for select to authenticated
  using ((auth.jwt() ->> 'email') = 'rxyan2@wm.edu');
drop policy if exists "Instructor reads comments" on public.investor_game_comments;
create policy "Instructor reads comments" on public.investor_game_comments for select to authenticated
  using ((auth.jwt() ->> 'email') = 'rxyan2@wm.edu');

-- Called before ANY portfolio/team/account mutation and by status reads. Taking the
-- game lock serializes writes with finalization. Even if nobody visits at closing,
-- the final state is frozen before the next write; no cron or open browser is needed.
create or replace function public.investor_game_prepare(p_game_id text)
returns void language plpgsql security definer set search_path = public as $$
declare g public.investor_games%rowtype; e record;
begin
  select * into g from public.investor_games where game_id = p_game_id for update;
  for e in select * from public.investor_game_events
    where game_id = p_game_id and ends_at <= now() and finalized_at is null
      and ends_at >= g.archive_started_at order by ends_at for update
  loop
    insert into public.investor_game_results
      (event_id, player_id, player_name, team_project_id, is_practice, is_instructor, budget, allocations, total_invested)
    select e.id, p.id, p.display_name, p.team_project_id, p.is_practice, p.is_instructor,
      p.budget + case when p.game_id = 'ep-investor-2026-2027' and not p.is_instructor
        and not p.is_practice and p.spring_bonus_at is null
        and e.ends_at >= timestamptz '2027-01-27 00:00 America/New_York' then 1000000 else 0 end,
      p.allocations, p.total_invested
    from public.investor_game_players p where p.game_id = p_game_id and p.is_active
    on conflict do nothing;
    update public.investor_game_events set finalized_at = now() where id = e.id;
  end loop;
  -- Instructor note: one additional $1M holiday bonus per student, effective when
  -- spring begins. Kept server-side; no advance student-facing announcement.
  update public.investor_game_players set budget = budget + 1000000, spring_bonus_at = now()
  where game_id = p_game_id and game_id = 'ep-investor-2026-2027'
    and not is_instructor and not is_practice and spring_bonus_at is null
    and now() >= timestamptz '2027-01-27 00:00 America/New_York';
end;
$$;
revoke all on function public.investor_game_prepare(text) from public, anon, authenticated;

create or replace function public.investor_game_activity_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select display_name, team_project_id into new.player_name, new.team_project_id
  from public.investor_game_players where id = new.player_id;
  return new;
end;
$$;
drop trigger if exists investor_activity_identity on public.investor_game_activity;
create trigger investor_activity_identity before insert on public.investor_game_activity
  for each row execute function public.investor_game_activity_identity();
revoke all on function public.investor_game_activity_identity() from public, anon, authenticated;

-- Syllabus Yang-only sessions; never overwrite an instructor time override.
insert into public.investor_game_events (id, game_id, label, starts_at, ends_at) values
('ep-investor-2026-08-31', 'ep-investor-2026-2027', 'Pitch Perfect I', '2026-08-31 13:00 America/New_York'::timestamptz, '2026-08-31 14:00 America/New_York'::timestamptz),
('ep-investor-2026-09-14', 'ep-investor-2026-2027', 'Pitch Perfect II', '2026-09-14 13:00 America/New_York'::timestamptz, '2026-09-14 14:00 America/New_York'::timestamptz),
('ep-investor-2026-10-19', 'ep-investor-2026-2027', 'Progress Report I', '2026-10-19 13:00 America/New_York'::timestamptz, '2026-10-19 14:00 America/New_York'::timestamptz),
('ep-investor-2026-11-16', 'ep-investor-2026-2027', 'Pitch Perfect III', '2026-11-16 13:00 America/New_York'::timestamptz, '2026-11-16 14:00 America/New_York'::timestamptz),
('ep-investor-2026-11-23', 'ep-investor-2026-2027', 'Team Preparation Day', '2026-11-23 13:00 America/New_York'::timestamptz, '2026-11-23 14:00 America/New_York'::timestamptz),
('ep-investor-2026-11-30', 'ep-investor-2026-2027', 'Progress Report II', '2026-11-30 13:00 America/New_York'::timestamptz, '2026-11-30 14:00 America/New_York'::timestamptz),
('ep-investor-2026-12-09', 'ep-investor-2026-2027', 'Mid-Year Presentations', '2026-12-09 14:00 America/New_York'::timestamptz, '2026-12-09 17:00 America/New_York'::timestamptz),
('ep-investor-2027-02-01', 'ep-investor-2026-2027', 'Progress Report III', '2027-02-01 13:00 America/New_York'::timestamptz, '2027-02-01 14:00 America/New_York'::timestamptz),
('ep-investor-2027-02-15', 'ep-investor-2026-2027', 'Writing Thesis I', '2027-02-15 13:00 America/New_York'::timestamptz, '2027-02-15 14:00 America/New_York'::timestamptz),
('ep-investor-2027-03-01', 'ep-investor-2026-2027', 'Progress Report IV', '2027-03-01 13:00 America/New_York'::timestamptz, '2027-03-01 14:00 America/New_York'::timestamptz),
('ep-investor-2027-03-22', 'ep-investor-2026-2027', 'Writing Thesis II', '2027-03-22 13:00 America/New_York'::timestamptz, '2027-03-22 14:00 America/New_York'::timestamptz),
('ep-investor-2027-04-05', 'ep-investor-2026-2027', 'Writing Thesis III', '2027-04-05 13:00 America/New_York'::timestamptz, '2027-04-05 14:00 America/New_York'::timestamptz),
('ep-investor-2027-04-12', 'ep-investor-2026-2027', 'Final Presentation I', '2027-04-12 13:00 America/New_York'::timestamptz, '2027-04-12 14:00 America/New_York'::timestamptz),
('ep-investor-2027-04-19', 'ep-investor-2026-2027', 'Final Presentation II', '2027-04-19 13:00 America/New_York'::timestamptz, '2027-04-19 14:00 America/New_York'::timestamptz)
on conflict (id) do nothing;

-- Game status -------------------------------------------------------------------

drop function if exists public.investor_game_status(text);
create function public.investor_game_status(p_game_id text)
returns table (game_id text, cohort_year text, title text, is_open boolean, totals_visible boolean,
  current_event text, budget integer, project_ids text[], accepting boolean, event_id text,
  starts_at timestamptz, ends_at timestamptz, server_now timestamptz)
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.investor_game_prepare(p_game_id);
  return query select g.game_id, g.cohort_year, g.title, g.is_open, g.totals_visible,
    coalesce(e.label, g.current_event), g.budget, g.project_ids,
    (g.is_open and coalesce(now() >= e.starts_at and now() < e.ends_at, false)),
    e.id, e.starts_at, e.ends_at, now()
  from public.investor_games g left join lateral (
    select ev.* from public.investor_game_events ev where ev.game_id = g.game_id
    order by case when ev.ends_at > now() then 0 else 1 end,
      case when ev.ends_at > now() then ev.starts_at end asc, ev.starts_at desc limit 1
  ) e on true where g.game_id = p_game_id;
end;
$$;
grant execute on function public.investor_game_status(text) to anon, authenticated;

-- Log in -------------------------------------------------------------------------
-- status: ok | wrong (unknown name or wrong password) | locked (5 misses, wait 2 minutes)

drop function if exists public.investor_game_login(text, text, text);

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
  is_instructor boolean,
  budget integer,
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
  perform public.investor_game_prepare(p_game_id);
  perform 1 from public.investor_games g where g.game_id = p_game_id;
  if not found then
    raise exception 'The investor game is not set up yet.' using errcode = '22023';
  end if;

  select * into player
  from public.investor_game_players pl
  where pl.game_id = p_game_id
    and pl.name_key = name_key_value and pl.is_active;

  if not found then
    return query select 'wrong'::text, null::text, null::text, null::boolean, null::boolean, null::integer, null::uuid, null::jsonb, null::timestamptz;
    return;
  end if;

  if player.locked_until is not null and player.locked_until > now() then
    return query select 'locked'::text, null::text, null::text, null::boolean, null::boolean, null::integer, null::uuid, null::jsonb, null::timestamptz;
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
      player.is_instructor,
      player.budget,
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

  return query select 'wrong'::text, null::text, null::text, null::boolean, null::boolean, null::integer, null::uuid, null::jsonb, null::timestamptz;
end;
$$;

grant execute on function public.investor_game_login(text, text, text) to anon, authenticated;

-- Restore a login on page reload ------------------------------------------------

drop function if exists public.investor_game_session(text, uuid);

create or replace function public.investor_game_session(
  p_game_id text,
  p_session_token uuid
)
returns table (
  player_name text,
  team_project_id text,
  is_practice boolean,
  is_instructor boolean,
  budget integer,
  allocations jsonb,
  saved_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  perform public.investor_game_prepare(p_game_id);
  return query select pl.display_name, pl.team_project_id, pl.is_practice, pl.is_instructor, pl.budget, pl.allocations, pl.last_saved_at
  from public.investor_game_players pl
  where pl.game_id = p_game_id
    and pl.session_token = p_session_token and pl.is_active;
end;
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
  active_event public.investor_game_events%rowtype;
  player public.investor_game_players%rowtype;
  clean_allocations jsonb := '{}'::jsonb;
  entry record;
  amount numeric;
  running_total numeric := 0;
  listed_project text;
  saved_time timestamptz := now();
begin
  perform public.investor_game_prepare(p_game_id);
  select * into game_row from public.investor_games g where g.game_id = p_game_id;
  if not found then
    raise exception 'The investor game is not set up yet.' using errcode = '22023';
  end if;

  select * into player
  from public.investor_game_players pl
  where pl.game_id = game_row.game_id
    and pl.session_token = p_session_token and pl.is_active for update;

  if not found then
    raise exception 'Your session ended. Log in again with your first name and password.' using errcode = '28000';
  end if;

  select * into active_event from public.investor_game_events e
    where e.game_id = p_game_id and now() >= e.starts_at and now() < e.ends_at;
  if not found or not game_row.is_open then
    raise exception 'Investing and comments are closed right now. You can still log in and view.' using errcode = '42501';
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

    if amount < 0 or amount > player.budget or amount <> trunc(amount) then
      raise exception 'Each investment must be a whole-dollar amount from $0 to %.',
        to_char(player.budget, 'FM$99,999,999') using errcode = '22023';
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

  if running_total > player.budget then
    raise exception 'Your total of % is more than your % budget.',
      to_char(running_total, 'FM$99,999,999'),
      to_char(player.budget, 'FM$99,999,999') using errcode = '22023';
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
    active_event.label,
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
   and not pl.is_practice and pl.is_active
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

  perform public.investor_game_prepare((select game_id from public.investor_game_players where id = p_player_id));
  select * into player from public.investor_game_players pl where pl.id = p_player_id for update;
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

-- Comments are scoped by the authenticated angel token in SQL, never filtered only in the UI.
drop function if exists public.investor_game_feedback(text, uuid);
create function public.investor_game_feedback(p_game_id text, p_session_token uuid)
returns table(id bigint, event_id text, event_label text, project_id text,
  body text, updated_at timestamptz, is_mine boolean)
language plpgsql security definer set search_path = public as $$
declare viewer public.investor_game_players%rowtype;
begin
  select * into viewer from public.investor_game_players p
  where p.game_id = p_game_id and p.session_token = p_session_token and p.is_active;
  if not found then raise exception 'Your session ended.' using errcode = '28000'; end if;
  return query select c.id, c.event_id, e.label, c.project_id, c.body, c.updated_at,
    c.player_id = viewer.id
  from public.investor_game_comments c join public.investor_game_events e on e.id = c.event_id
  join public.investor_game_players author on author.id = c.player_id
  where e.game_id = p_game_id and (c.player_id = viewer.id
    or (c.project_id = viewer.team_project_id and not author.is_practice))
  order by e.starts_at desc, c.updated_at desc, c.id desc;
end;
$$;

create or replace function public.investor_game_save_comment(
  p_game_id text, p_session_token uuid, p_event_id text, p_project_id text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare viewer public.investor_game_players%rowtype; g public.investor_games%rowtype;
begin
  perform public.investor_game_prepare(p_game_id);
  select * into viewer from public.investor_game_players p
    where p.game_id = p_game_id and p.session_token = p_session_token and p.is_active;
  if not found then raise exception 'Your session ended.' using errcode = '28000'; end if;
  select * into g from public.investor_games where game_id = p_game_id;
  if not g.is_open or not exists (select 1 from public.investor_game_events e
    where e.id = p_event_id and e.game_id = p_game_id and now() >= e.starts_at and now() < e.ends_at)
  then raise exception 'Investing and comments are closed right now.' using errcode = '42501'; end if;
  if p_project_id is null or not (p_project_id = any(g.project_ids))
    or p_project_id = viewer.team_project_id
  then raise exception 'Choose another team for your feedback.' using errcode = '22023'; end if;
  if p_body is null or char_length(trim(p_body)) not between 1 and 500
  then raise exception 'Write a short comment of 1 to 500 characters.' using errcode = '22023'; end if;
  insert into public.investor_game_comments(event_id, player_id, player_name, project_id, body)
  values (p_event_id, viewer.id, viewer.display_name, p_project_id, trim(p_body))
  on conflict(event_id, player_id, project_id) do update set body = excluded.body, updated_at = now();
end;
$$;

-- Public archive contains team totals only and respects the same visibility switch as live totals.
create or replace function public.investor_game_events_list(p_game_id text)
returns table(id text, label text, starts_at timestamptz, ends_at timestamptz, finalized_at timestamptz,
  totals jsonb)
language plpgsql security definer set search_path = public as $$
begin
  perform public.investor_game_prepare(p_game_id);
  return query select e.id, e.label, e.starts_at, e.ends_at, e.finalized_at,
    case when g.totals_visible and e.finalized_at is not null then
      (select jsonb_object_agg(t.pid, t.total) from (
        select pid, coalesce(sum((r.allocations ->> pid)::bigint), 0) as total
        from unnest(g.project_ids) pid left join public.investor_game_results r
          on r.event_id = e.id and not r.is_practice group by pid
      ) t) else null end
  from public.investor_game_events e join public.investor_games g on g.game_id = e.game_id
  where e.game_id = p_game_id order by e.starts_at;
end;
$$;

create or replace function public.investor_game_my_results(p_game_id text, p_session_token uuid)
returns setof public.investor_game_results
language plpgsql security definer set search_path = public as $$
declare viewer public.investor_game_players%rowtype;
begin
  perform public.investor_game_prepare(p_game_id);
  select * into viewer from public.investor_game_players p
    where p.game_id = p_game_id and p.session_token = p_session_token and p.is_active;
  if not found then raise exception 'Your session ended.' using errcode = '28000'; end if;
  return query select r.* from public.investor_game_results r
    join public.investor_game_events e on e.id = r.event_id
    where e.game_id = p_game_id and r.player_id = viewer.id
    order by e.starts_at desc, r.player_name;
end;
$$;

create or replace function public.investor_game_admin_event(p_event_id text, p_starts_at timestamptz, p_ends_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare e public.investor_game_events%rowtype;
begin
  if coalesce(auth.jwt() ->> 'email', '') <> 'rxyan2@wm.edu'
  then raise exception 'Instructor only.' using errcode = '42501'; end if;
  select * into e from public.investor_game_events where id = p_event_id;
  if not found then raise exception 'Session not found.' using errcode = '22023'; end if;
  perform public.investor_game_prepare(e.game_id);
  if e.ends_at <= now() or p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at or p_ends_at <= now()
    or (p_starts_at at time zone 'America/New_York')::date <> (e.starts_at at time zone 'America/New_York')::date
    or (p_ends_at at time zone 'America/New_York')::date <> (e.starts_at at time zone 'America/New_York')::date
  then raise exception 'Use a valid window on this session date. Completed sessions stay archived.' using errcode = '22023'; end if;
  if exists(select 1 from public.investor_game_events other where other.game_id = e.game_id
    and other.id <> e.id and other.starts_at < p_ends_at and other.ends_at > p_starts_at)
  then raise exception 'Session windows cannot overlap.' using errcode = '22023'; end if;
  update public.investor_game_events set starts_at = p_starts_at, ends_at = p_ends_at where id = e.id;
end;
$$;

create or replace function public.investor_game_admin_archive_player(p_player_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.jwt() ->> 'email', '') <> 'rxyan2@wm.edu'
  then raise exception 'Instructor only.' using errcode = '42501'; end if;
  perform public.investor_game_prepare((select game_id from public.investor_game_players where id = p_player_id));
  update public.investor_game_players set is_active = false, session_token = gen_random_uuid() where id = p_player_id;
end;
$$;

revoke all on function public.investor_game_feedback(text, uuid) from public;
revoke all on function public.investor_game_save_comment(text, uuid, text, text, text) from public;
revoke all on function public.investor_game_events_list(text) from public;
revoke all on function public.investor_game_my_results(text, uuid) from public;
grant execute on function public.investor_game_feedback(text, uuid) to anon, authenticated;
grant execute on function public.investor_game_save_comment(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.investor_game_events_list(text) to anon, authenticated;
grant execute on function public.investor_game_my_results(text, uuid) to anon, authenticated;
revoke all on function public.investor_game_admin_event(text, timestamptz, timestamptz) from public, anon;
revoke all on function public.investor_game_admin_archive_player(uuid) from public, anon;
grant execute on function public.investor_game_admin_event(text, timestamptz, timestamptz) to authenticated;
grant execute on function public.investor_game_admin_archive_player(uuid) to authenticated;

commit;
