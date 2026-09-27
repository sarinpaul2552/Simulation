-- Batch 6A live pre-flight (READ-ONLY). Returns one JSON document describing the objects the V2 migration touches.
select json_build_object(
  'rls', (select json_object_agg(c.relname, c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname in ('sessions','teams','decisions','access_codes','access_log','v2_team_games','v2_quarter_resolutions','v2_votes')),
  'policies', (select json_agg(json_build_object('table', tablename, 'policy', policyname, 'cmd', cmd, 'qual', qual) order by tablename, policyname)
               from pg_policies where schemaname = 'public'),
  'session_columns', (select json_agg(column_name || ':' || data_type || coalesce(':default=' || column_default, '') order by ordinal_position)
                      from information_schema.columns where table_schema = 'public' and table_name = 'sessions'),
  'session_constraints', (select json_agg(conname || ' ' || pg_get_constraintdef(oid)) from pg_constraint where conrelid = 'public.sessions'::regclass),
  'functions', (select json_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' order by p.proname)
                from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
  'row_counts', json_build_object(
     'sessions', (select count(*) from sessions), 'teams', (select count(*) from teams), 'decisions', (select count(*) from decisions),
     'access_codes', (select count(*) from access_codes), 'access_log', (select count(*) from access_log)),
  'roles', (select json_agg(rolname) from pg_roles where rolname in ('anon','authenticated','service_role')),
  'pg_version', version()
) as preflight;
