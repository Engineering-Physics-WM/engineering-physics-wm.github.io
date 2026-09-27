-- Saved cohort team memberships for dashboard previews and team email groups.
-- Run after supabase/schema.sql when you are ready to persist final assignments.

create table if not exists public.cohort_team_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cohort_year text not null default '2026-2027',
  project_id text not null,
  project_number integer,
  person_name text not null,
  person_email text,
  member_type text not null,
  source text not null default 'manual',
  locked boolean not null default false,
  sort_order integer,
  assigned_by_email text,
  constraint cohort_team_members_member_type
    check (member_type in ('student', 'mentor')),
  constraint cohort_team_members_source
    check (source in ('auto_match', 'manual', 'honors_default', 'project_catalog')),
  constraint cohort_team_members_email_shape
    check (person_email is null or person_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

create unique index if not exists cohort_team_members_unique_project_member
on public.cohort_team_members (cohort_year, project_id, lower(person_email), member_type)
where person_email is not null;

create unique index if not exists cohort_team_members_one_student_team
on public.cohort_team_members (cohort_year, lower(person_email))
where member_type = 'student' and person_email is not null;

alter table public.cohort_team_members enable row level security;

drop policy if exists "Instructor can manage team members" on public.cohort_team_members;
create policy "Instructor can manage team members"
on public.cohort_team_members
for all
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'))
with check ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));

-- Future flow:
-- 1. Auto-match creates student rows with source = 'auto_match' or 'honors_default'.
-- 2. Project mentors create mentor rows with source = 'project_catalog'.
-- 3. Manual dashboard overrides update these rows.
-- 4. Announcement email jobs read these rows for team, team_students, and team_mentors.
