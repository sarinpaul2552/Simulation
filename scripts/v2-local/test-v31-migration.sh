#!/usr/bin/env bash
# NexLearn V3.1 Stage 2 — migration and rollback test on a POPULATED disposable local database.
# Never point this at a shared or production database: it recreates the local database (scripts/v2-local/up.sh).
#
#  1. Build the pre-Stage-2 database (V3 migration only) and populate it with the V2 and V3 database suites.
#  2. Fingerprint schema and data; dump every stored game.
#  3. Apply MIGRATION_V3_1_ENGINE_VERSION.sql twice. Existing data must be unchanged (econ_version NULL everywhere),
#     every stored snapshot must pass the server check, and every stored game must restore and replay in the client.
#  4. Superuser trigger/constraint checks (the paths the public key cannot reach at all).
#  5. Run all three database suites on the migrated database.
#  6. Rollback with a v3-econ-1.1 session present must be refused.
#  7. Fresh populated database → migrate → V2/V3 suites + an explicit 1.0 session → rollback must succeed and restore
#     the pre-migration schema fingerprint exactly; stored games still verify; V2/V3 suites pass; re-apply; all suites pass.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
OUT="${OUT:-/tmp/v31-migration-test}"; mkdir -p "$OUT"
export PGOPTIONS="-c client_min_messages=warning"
PSQL="psql -h /tmp -p 54329 -U postgres -d sim -v ON_ERROR_STOP=1 -qAt"
MIG="$ROOT/database/MIGRATION_V3_1_ENGINE_VERSION.sql"; RB="$ROOT/database/ROLLBACK_V3_1_ENGINE_VERSION.sql"
KEY=$(node "$HERE/anon-key.mjs" local-dev-jwt-secret-at-least-32-characters-long)
suites() { (cd "$ROOT" && V2_DB_URL=http://localhost:54321 V2_DB_KEY=$KEY npx vitest run "$@" 2>&1 | grep -E "Test Files|Tests " ); }
schema_fp() { $PSQL -c "SELECT md5(
  (SELECT string_agg(pg_get_functiondef(p.oid), E'\n' ORDER BY p.oid::regprocedure::text) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prokind = 'f') ||
  (SELECT string_agg(column_name || ':' || data_type || ':' || coalesce(column_default, ''), ',' ORDER BY column_name) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sessions') ||
  (SELECT string_agg(conname || ':' || pg_get_constraintdef(oid), ',' ORDER BY conname) FROM pg_constraint WHERE conrelid = 'sessions'::regclass) ||
  (SELECT string_agg(tgname, ',' ORDER BY tgname) FROM pg_trigger WHERE tgrelid = 'sessions'::regclass AND NOT tgisinternal) ||
  (SELECT coalesce(string_agg(p.oid::regprocedure::text || ':' || array_to_string(p.proacl, ' '), ',' ORDER BY p.oid::regprocedure::text), '') FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'))"; }
data_fp() { $PSQL -c "SELECT md5(
  (SELECT string_agg(concat_ws('|', id, session_code, engine_version, econ_engine, market_path, participation_mode, v2_pacing, v2_open_quarter, commitment_mode), ',' ORDER BY id) FROM sessions) ||
  (SELECT coalesce(string_agg(concat_ws('|', team_id, state_version, completed_quarter, phase, snapshot::text, headline::text), ',' ORDER BY team_id), '') FROM v2_team_games) ||
  (SELECT coalesce(string_agg(concat_ws('|', team_id, quarter, input::text, state_version_after), ',' ORDER BY team_id, quarter), '') FROM v2_quarter_resolutions))"; }
dump_games() { $PSQL -c "SELECT coalesce(json_agg(v2__game_json(g.team_id) ORDER BY g.team_id), '[]') FROM v2_team_games g" > "$1"; }
expect_fail() { if $PSQL -c "$1" >/dev/null 2>"$OUT/err.txt"; then echo "UNEXPECTED SUCCESS: $1"; exit 1; else echo "  refused as expected: $(head -c 140 "$OUT/err.txt" | tr '\n' ' ')"; fi; }

echo "== 1. pre-Stage-2 database, populated"
V2_SKIP_V31=1 bash "$HERE/up.sh" >/dev/null 2>&1
suites src/production/v2/db.integration.test.ts src/production/v2/db.v3.integration.test.ts
echo "sessions: $($PSQL -c "SELECT econ_engine || '=' || count(*) FROM sessions GROUP BY econ_engine ORDER BY 1" | tr '\n' ' ')  games: $($PSQL -c "SELECT count(*) FROM v2_team_games")  completed V3 games: $($PSQL -c "SELECT count(*) FROM v2_team_games g JOIN sessions s ON s.id = g.session_id WHERE s.econ_engine = 'v3' AND g.completed_quarter = 8")"
SCHEMA_PRE=$(schema_fp); DATA_PRE=$(data_fp)
dump_games "$OUT/games_pre.json"

echo "== 2. apply the migration (twice)"
$PSQL -1 -f "$MIG"; $PSQL -1 -f "$MIG"
[ "$(data_fp)" = "$DATA_PRE" ] && echo "  existing data unchanged" || { echo "DATA CHANGED"; exit 1; }
[ "$($PSQL -c "SELECT count(*) FROM sessions WHERE econ_version IS NOT NULL")" = "0" ] && echo "  econ_version NULL on every existing session"
$PSQL -c "SELECT count(*) FROM (SELECT v3__check_snapshot_engine(g.session_id, g.snapshot) FROM v2_team_games g) x" >/dev/null && echo "  every stored snapshot passes the server engine check"
dump_games "$OUT/games_post.json"
(cd "$ROOT" && npx vite-node scripts/v2-local/verify-stored-games.ts "$OUT/games_post.json")
cmp -s <(python3 -c "import json,sys;[print(json.dumps({k:v for k,v in {**g,'session':{k2:v2 for k2,v2 in g['session'].items() if k2!='econ_version'}}.items()},sort_keys=True)) for g in json.load(open(sys.argv[1]))]" "$OUT/games_pre.json") \
       <(python3 -c "import json,sys;[print(json.dumps({k:v for k,v in {**g,'session':{k2:v2 for k2,v2 in g['session'].items() if k2!='econ_version'}}.items()},sort_keys=True)) for g in json.load(open(sys.argv[1]))]" "$OUT/games_post.json") \
  && echo "  client game payloads identical apart from the new econ_version field"

echo "== 3. trigger and constraint (superuser)"
STARTED_V3=$($PSQL -c "SELECT s.id FROM sessions s JOIN v2_team_games g ON g.session_id = s.id WHERE s.econ_engine = 'v3' LIMIT 1")
V2S=$($PSQL -c "SELECT id FROM sessions WHERE econ_engine = 'v2' LIMIT 1")
expect_fail "UPDATE sessions SET econ_version = '1.1' WHERE id = '$STARTED_V3'"
expect_fail "UPDATE sessions SET econ_version = '1.0' WHERE id = '$STARTED_V3'"
expect_fail "UPDATE sessions SET econ_version = '1.1' WHERE id = '$V2S'"
expect_fail "UPDATE sessions SET econ_version = '2.0' WHERE econ_engine = 'v3'"

echo "== 4. all database suites on the migrated database"
suites src/production/v2/db.integration.test.ts src/production/v2/db.v3.integration.test.ts src/production/v2/db.v31.integration.test.ts
STARTED_11=$($PSQL -c "SELECT s.id FROM sessions s JOIN v2_team_games g ON g.session_id = s.id WHERE s.econ_version = '1.1' LIMIT 1")
expect_fail "UPDATE sessions SET econ_version = '1.0' WHERE id = '$STARTED_11'"
expect_fail "UPDATE sessions SET econ_version = NULL WHERE id = '$STARTED_11'"
dump_games "$OUT/games_all.json"
(cd "$ROOT" && npx vite-node scripts/v2-local/verify-stored-games.ts "$OUT/games_all.json")

echo "== 5. rollback refused while v3-econ-1.1 sessions exist"
expect_fail "\\i $RB"
[ "$($PSQL -c "SELECT count(*) FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'econ_version'")" = "1" ] && echo "  nothing was rolled back"

echo "== 6. rollback on a populated database without 1.1 sessions"
V2_SKIP_V31=1 bash "$HERE/up.sh" >/dev/null 2>&1
suites src/production/v2/db.integration.test.ts src/production/v2/db.v3.integration.test.ts
SCHEMA_PRE2=$(schema_fp)
$PSQL -1 -f "$MIG"
suites src/production/v2/db.integration.test.ts src/production/v2/db.v3.integration.test.ts
$PSQL -c "SELECT v3_create_session_v('f@school.edu', ARRAY['Explicit10'], 'team_device', 'self', 'A', '1.0')" >/dev/null
$PSQL -1 -f "$RB"
[ "$(schema_fp)" = "$SCHEMA_PRE2" ] && echo "  schema fingerprint restored exactly (functions, grants, columns, constraints, triggers)" || { echo "SCHEMA DIFFERS AFTER ROLLBACK"; exit 1; }
dump_games "$OUT/games_rolledback.json"
(cd "$ROOT" && npx vite-node scripts/v2-local/verify-stored-games.ts "$OUT/games_rolledback.json")
suites src/production/v2/db.integration.test.ts src/production/v2/db.v3.integration.test.ts
echo "== 7. re-apply after rollback"
$PSQL -1 -f "$MIG"
suites src/production/v2/db.integration.test.ts src/production/v2/db.v3.integration.test.ts src/production/v2/db.v31.integration.test.ts
echo "pre-migration schema fingerprint (run 1): $SCHEMA_PRE"
echo "ALL V3.1 MIGRATION CHECKS PASSED"
