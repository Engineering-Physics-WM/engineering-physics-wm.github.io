-- Template only. Copy into an ignored private SQL file before using real dates.
-- Configure one cohort's public ranking poll state.

insert into public.ranking_poll_settings (
  cohort_year,
  is_open,
  closes_at,
  closed_message
)
values (
  '2027-2028',
  false,
  null,
  'The 2027-2028 ranking poll is not open yet.'
)
on conflict (cohort_year) do update
set
  is_open = excluded.is_open,
  closes_at = excluded.closes_at,
  closed_message = excluded.closed_message,
  updated_at = now();
