-- Synthetic fixtures only. Run via npm run test:investor-db (never on production).
create function public.test_assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Assertion failed: %', message; end if; end;
$$;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
insert into public.investor_game_players(id, game_id, display_name, name_key, password_hash, session_token, team_project_id, is_instructor, is_practice, budget)
values
('00000000-0000-0000-0000-000000000001','ep-investor-2026-2027','Test A','test a',extensions.crypt('test-pass',extensions.gen_salt('bf',4)),'00000000-0000-0000-0000-000000000011','animal-crossing',false,false,1000000),
('00000000-0000-0000-0000-000000000002','ep-investor-2026-2027','Test B','test b',extensions.crypt('test-pass',extensions.gen_salt('bf',4)),'00000000-0000-0000-0000-000000000012','smr-heat-load',false,false,1000000),
('00000000-0000-0000-0000-000000000003','ep-investor-2026-2027','Test C','test c',extensions.crypt('test-pass',extensions.gen_salt('bf',4)),'00000000-0000-0000-0000-000000000013','smr-heat-load',false,false,1000000),
('00000000-0000-0000-0000-000000000004','ep-investor-2026-2027','Test D','test d',extensions.crypt('test-pass',extensions.gen_salt('bf',4)),'00000000-0000-0000-0000-000000000014','laser-optics',false,false,1000000),
('00000000-0000-0000-0000-000000000005','ep-investor-2026-2027','Test Ran','test ran',extensions.crypt('test-pass',extensions.gen_salt('bf',4)),'00000000-0000-0000-0000-000000000015',null,true,false,10000000),
('00000000-0000-0000-0000-000000000006','ep-investor-2026-2027','Test Demo','test demo',extensions.crypt('test-pass',extensions.gen_salt('bf',4)),'00000000-0000-0000-0000-000000000016',null,false,true,1000000);

set role anon;
select public.test_assert((select count(*) = 0 from investor_game_players), 'anonymous cannot read accounts');
select public.test_assert((select count(*) = 0 from investor_game_comments), 'anonymous cannot read comments');
select public.test_assert((select status = 'ok' from investor_game_login('ep-investor-2026-2027','Test A','test-pass')), 'login works outside window');
select public.test_assert((select not accepting from investor_game_status('ep-investor-2026-2027')), 'closed before event');
select set_config('test.now','2026-09-14 12:59:59 America/New_York',false);
do $$ begin
  perform investor_game_save('ep-investor-2026-2027','00000000-0000-0000-0000-000000000011','{"smr-heat-load":100000}');
  raise exception 'early investment accepted';
exception when insufficient_privilege then null; end $$;
select set_config('test.now','2026-09-14 13:00:00 America/New_York',false);
select public.test_assert((select accepting from investor_game_status('ep-investor-2026-2027')), 'opens exactly at 1 ET');
select investor_game_save('ep-investor-2026-2027','00000000-0000-0000-0000-000000000011','{"smr-heat-load":100000}');
select public.test_assert((select not changed from investor_game_save('ep-investor-2026-2027','00000000-0000-0000-0000-000000000011','{"smr-heat-load":100000}')), 'unchanged saves do not add ledger rows');
select investor_game_save('ep-investor-2026-2027','00000000-0000-0000-0000-000000000015','{"smr-heat-load":5000000}');
select investor_game_save('ep-investor-2026-2027','00000000-0000-0000-0000-000000000016','{"smr-heat-load":1000000}');
select public.test_assert((select total_raised = 5100000 from investor_game_public_totals('ep-investor-2026-2027') where project_id='smr-heat-load'), 'practice excluded, instructor included');
do $$ begin
  perform investor_game_save('ep-investor-2026-2027','00000000-0000-0000-0000-000000000011','{"animal-crossing":10000}');
  raise exception 'own team accepted';
exception when insufficient_privilege then null; end $$;
select investor_game_save_comment('ep-investor-2026-2027','00000000-0000-0000-0000-000000000011','ep-investor-2026-09-14','smr-heat-load','Useful feedback');
select investor_game_save_comment('ep-investor-2026-2027','00000000-0000-0000-0000-000000000016','ep-investor-2026-09-14','smr-heat-load','Practice feedback');
select public.test_assert((select count(*)=1 from investor_game_feedback('ep-investor-2026-2027','00000000-0000-0000-0000-000000000011')), 'author sees own feedback');
select public.test_assert((select count(*)=1 from investor_game_feedback('ep-investor-2026-2027','00000000-0000-0000-0000-000000000012')), 'receiving student sees feedback without practice comments');
select public.test_assert((select count(*)=1 from investor_game_feedback('ep-investor-2026-2027','00000000-0000-0000-0000-000000000013')), 'teammate sees received feedback');
select public.test_assert((select count(*)=0 from investor_game_feedback('ep-investor-2026-2027','00000000-0000-0000-0000-000000000014')), 'unrelated student cannot see feedback');
select public.test_assert((select count(*)=0 from investor_game_feedback('ep-investor-2026-2027','00000000-0000-0000-0000-000000000015')), 'instructor angel does not bypass dashboard privacy');
do $$ begin
  perform investor_game_save_comment('ep-investor-2026-2027','00000000-0000-0000-0000-000000000011','ep-investor-2026-10-19','smr-heat-load','Spoof event');
  raise exception 'wrong event accepted';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform investor_game_feedback('ep-investor-2026-2027','00000000-0000-0000-0000-000000000099');
  raise exception 'invalid token accepted';
exception when invalid_authorization_specification then null; end $$;
select set_config('test.now','2026-09-14 14:00:00 America/New_York',false);
select public.test_assert((select not accepting from investor_game_status('ep-investor-2026-2027')), 'closes exactly at 2 ET');
do $$ begin
  perform investor_game_save_comment('ep-investor-2026-2027','00000000-0000-0000-0000-000000000011','ep-investor-2026-09-14','smr-heat-load','Late edit');
  raise exception 'late comment accepted';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform investor_game_save('ep-investor-2026-2027','00000000-0000-0000-0000-000000000011','{"smr-heat-load":200000}');
  raise exception 'late investment accepted';
exception when insufficient_privilege then null; end $$;
select public.test_assert((select count(*)=1 from investor_game_my_results('ep-investor-2026-2027','00000000-0000-0000-0000-000000000011')), 'student sees only own snapshot');
select public.test_assert((select count(*)=1 from investor_game_my_results('ep-investor-2026-2027','00000000-0000-0000-0000-000000000015')), 'instructor angel sees only own snapshot outside dashboard');
select public.test_assert((select (totals->>'smr-heat-load')::integer=5100000 from investor_game_events_list('ep-investor-2026-2027') where id='ep-investor-2026-09-14'), 'public archive excludes practice');
reset role;
select public.test_assert((select count(*)=3 from investor_game_activity), 'ledger saved exactly one entry per changed portfolio');
select public.test_assert((select count(*)=6 from investor_game_results), 'finalization is idempotent');

set role authenticated;
select set_config('request.jwt.claims','{"email":"rxyan2@wm.edu"}',false);
select public.test_assert((select count(*)=2 from investor_game_comments), 'dashboard instructor reads all feedback');
select investor_game_admin_event('ep-investor-2026-10-19','2026-10-19 12:00 America/New_York','2026-10-19 13:00 America/New_York');
select set_config('test.now','2026-10-19 12:00:00 America/New_York',false);
select public.test_assert((select accepting from investor_game_status('ep-investor-2026-2027')), 'override opens at selected time');
select investor_game_save('ep-investor-2026-2027','00000000-0000-0000-0000-000000000011','{"smr-heat-load":300000}');
select public.test_assert((select (allocations->>'smr-heat-load')::integer=100000 from investor_game_results where event_id='ep-investor-2026-09-14' and player_id='00000000-0000-0000-0000-000000000001'), 'later investments preserve prior session');
update investor_games set is_open=false where game_id='ep-investor-2026-2027';
select public.test_assert((select not accepting from investor_game_status('ep-investor-2026-2027')), 'manual pause takes precedence');
update investor_games set is_open=true, totals_visible=false where game_id='ep-investor-2026-2027';
select public.test_assert((select bool_and(totals is null) from investor_game_events_list('ep-investor-2026-2027')), 'archive totals obey visibility');
select set_config('test.now','2026-10-19 13:00:00 America/New_York',false);
select investor_game_admin_update_player('00000000-0000-0000-0000-000000000001',null,'smr-heat-load');
select public.test_assert((select (allocations->>'smr-heat-load')::integer=300000 from investor_game_results where event_id='ep-investor-2026-10-19' and player_id='00000000-0000-0000-0000-000000000001'), 'team correction first archives closing result');
select investor_game_admin_archive_player('00000000-0000-0000-0000-000000000001');
select public.test_assert((select count(*)=2 from investor_game_comments), 'archiving preserves comments');
select public.test_assert((select count(*)=5 from investor_game_activity), 'archiving preserves activity');
select public.test_assert((select count(*)=0 from investor_game_session('ep-investor-2026-2027','00000000-0000-0000-0000-000000000011')), 'archived login disabled');
select set_config('request.jwt.claims','{"email":"unrelated@example.test"}',false);
select public.test_assert((select count(*)=0 from investor_game_results), 'other authenticated users cannot read results');
select public.test_assert((select count(*)=0 from investor_game_comments), 'other authenticated users cannot read feedback');
reset role;

-- Spring rollover, including persistent login restoration, repeated calls and unchanged portfolios.
select set_config('test.now','2027-01-26 23:59:59 America/New_York',false);
select public.test_assert((select budget=1000000 from investor_game_session('ep-investor-2026-2027','00000000-0000-0000-0000-000000000012')), 'no early bonus');
select set_config('test.now','2027-01-27 00:00:00 America/New_York',false);
select public.test_assert((select budget=2000000 from investor_game_session('ep-investor-2026-2027','00000000-0000-0000-0000-000000000012')), 'spring grants extra million');
select public.test_assert((select budget=2000000 from investor_game_session('ep-investor-2026-2027','00000000-0000-0000-0000-000000000012')), 'bonus granted once');
select public.test_assert((select budget=10000000 from investor_game_session('ep-investor-2026-2027','00000000-0000-0000-0000-000000000015')), 'instructor budget unchanged');
select public.test_assert((select budget=1000000 from investor_game_session('ep-investor-2026-2027','00000000-0000-0000-0000-000000000016')), 'practice budget unchanged');
select public.test_assert((select budget=1000000 from investor_game_results where event_id='ep-investor-2026-09-14' and player_id='00000000-0000-0000-0000-000000000002'), 'fall archive budget unchanged');
select set_config('test.now','2027-03-22 17:00:00+00',false);
select public.test_assert((select accepting from investor_game_status('ep-investor-2026-2027')), 'DST uses Eastern 1 pm');

-- Student RPCs must omit commenter identity, not merely hide it in the page.
select public.test_assert(not exists(select 1 from jsonb_object_keys((select to_jsonb(f) from investor_game_feedback('ep-investor-2026-2027','00000000-0000-0000-0000-000000000012') f limit 1)) k where k in ('player_name','player_id','session_token')), 'feedback API omits author identity');
select public.test_assert((select count(*) = 6 from investor_game_results where event_id='ep-investor-2026-09-14'), 'archived session includes nonparticipants');
