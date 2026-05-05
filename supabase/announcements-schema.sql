-- Public cohort announcements plus instructor-only email send jobs.
-- Run after supabase/schema.sql when you are ready to move updates into Supabase.

create table if not exists public.cohort_announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cohort_year text not null default '2026-2027',
  slug text not null,
  title text not null,
  summary text not null,
  body jsonb not null default '[]'::jsonb,
  resources jsonb not null default '[]'::jsonb,
  audience_label text,
  pinned boolean not null default false,
  display_order integer,
  publish_at timestamptz not null default now(),
  status text not null default 'draft',
  created_by_email text,
  constraint cohort_announcements_status
    check (status in ('draft', 'published', 'archived')),
  constraint cohort_announcements_unique_slug
    unique (cohort_year, slug)
);

create table if not exists public.announcement_email_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  announcement_id uuid not null references public.cohort_announcements(id) on delete cascade,
  cohort_year text not null default '2026-2027',
  audience_type text not null,
  team_project_id text,
  requested_by_email text,
  status text not null default 'queued',
  recipient_count integer not null default 0,
  sent_at timestamptz,
  error_message text,
  constraint announcement_email_jobs_audience
    check (audience_type in ('all', 'students', 'honors_students', 'mentors', 'team')),
  constraint announcement_email_jobs_status
    check (status in ('queued', 'sending', 'sent', 'failed'))
);

alter table public.cohort_announcements enable row level security;
alter table public.announcement_email_jobs enable row level security;

drop policy if exists "Published announcements are public" on public.cohort_announcements;
create policy "Published announcements are public"
on public.cohort_announcements
for select
to anon, authenticated
using (status = 'published' and publish_at <= now());

drop policy if exists "Instructor can manage announcements" on public.cohort_announcements;
create policy "Instructor can manage announcements"
on public.cohort_announcements
for all
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'))
with check ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));

drop policy if exists "Instructor can manage announcement email jobs" on public.announcement_email_jobs;
create policy "Instructor can manage announcement email jobs"
on public.announcement_email_jobs
for all
to authenticated
using ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'))
with check ((auth.jwt() ->> 'email') in ('rxyan2@wm.edu'));

-- Email sending should happen in a Supabase Edge Function or other trusted backend
-- using a private email-provider API key. The browser should only create a send job.
