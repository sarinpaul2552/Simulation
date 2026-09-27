-- Batch 6B live post-migration verification (READ-ONLY).
with rpcs(name) as (values ('v2_create_session'),('v2_facilitator_overview'),('v2_facilitator_set_open_quarter'),('v2_facilitator_set_pacing'),
  ('v2_facilitator_audit'),('v2_join'),('v2_get_game'),('v2_init_game'),('v2_save_draft'),('v2_set_phase'),('v2_submit_vote'),('v2_get_votes'),
  ('v2_resolve_quarter'),('v2_save_reflection')),
helpers(name) as (values ('v2__team_id'),('v2__facilitator_session'),('v2__envelope'),('v2__check_input'),('v2__game_json'))
select json_build_object(
  'tables', (select json_agg(c.relname || ' rls=' || c.relrowsecurity || ' force=' || c.relforcerowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relname in ('v2_team_games','v2_quarter_resolutions','v2_votes','access_log','sessions','teams','decisions','access_codes')),
  'policies', (select json_agg(tablename || '.' || policyname || ' ' || cmd || ' ' || qual order by tablename) from pg_policies where schemaname='public'),
  'new_session_columns', (select json_agg(column_name || ':' || coalesce(column_default,'')) from information_schema.columns
             where table_schema='public' and table_name='sessions' and column_name in ('engine_version','participation_mode','v2_pacing','v2_open_quarter')),
  'rpcs', (select json_agg(r.name || ' exists=' || exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=r.name)
             || ' anon_exec=' || coalesce((select bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=r.name), false)
             || ' definer=' || coalesce((select bool_and(p.prosecdef) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=r.name), false)
             || ' search_path=' || coalesce((select string_agg(array_to_string(p.proconfig, ','), ';') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=r.name), 'none'))
             from rpcs r),
  'helpers_anon_exec', (select json_agg(h.name || '=' || coalesce((select bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=h.name), false)) from helpers h),
  'anon_table_privs', (select json_agg(t || '=' || has_table_privilege('anon', 'public.' || t, 'SELECT') || '/' || has_table_privilege('anon', 'public.' || t, 'INSERT'))
             from unnest(array['v2_team_games','v2_quarter_resolutions','v2_votes']) t),
  'row_counts', json_build_object('sessions', (select count(*) from sessions), 'teams', (select count(*) from teams), 'decisions', (select count(*) from decisions),
             'access_codes', (select count(*) from access_codes), 'access_log', (select count(*) from access_log),
             'v2_team_games', (select count(*) from v2_team_games), 'v2_quarter_resolutions', (select count(*) from v2_quarter_resolutions), 'v2_votes', (select count(*) from v2_votes)),
  'existing_sessions_engine', (select json_object_agg(engine_version, n) from (select engine_version, count(*) n from sessions group by 1) x)
) as postflight;
