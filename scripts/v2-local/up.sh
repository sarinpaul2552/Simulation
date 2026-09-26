#!/usr/bin/env bash
# Local V2 verification stack: PostgreSQL 16 + PostgREST (Supabase-compatible /rest/v1 via proxy.mjs).
# Usage: scripts/v2-local/up.sh   (idempotent: recreates the database each run)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/../.."
PGDATA=/tmp/v2pg/data; PGPORT=54329; PGRST_PORT=54330; PROXY_PORT=54321
PGBIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
mkdir -p /tmp/v2pg && chown postgres /tmp/v2pg
if [ ! -d "$PGDATA" ]; then su postgres -c "$PGBIN/initdb -D $PGDATA -A trust >/dev/null"; fi
su postgres -c "$PGBIN/pg_ctl -D $PGDATA -o '-p $PGPORT -k /tmp' -l /tmp/v2pg/pg.log status >/dev/null" || \
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA -o '-p $PGPORT -k /tmp' -l /tmp/v2pg/pg.log start -w >/dev/null"
export PGOPTIONS="-c client_min_messages=warning"; PSQL="psql -h /tmp -p $PGPORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -d postgres -c "DROP DATABASE IF EXISTS sim WITH (FORCE)" -c "CREATE DATABASE sim"
$PSQL -d sim -f "$HERE/bootstrap.sql"
$PSQL -d sim -f "$ROOT/database/schema.sql"
$PSQL -d sim -f "$ROOT/database/MIGRATION_STRICT_RLS_RPC_ARCHITECTURE.sql"
$PSQL -d sim -f "$ROOT/database/MIGRATION_V2_PRODUCTION.sql"
$PSQL -d sim -f "$ROOT/database/MIGRATION_V2_PRODUCTION.sql"   # idempotency check: second run must succeed
SECRET="local-dev-jwt-secret-at-least-32-characters-long"
cat > /tmp/v2pg/postgrest.conf <<CONF
db-uri = "postgres://authenticator:authenticator@localhost:$PGPORT/sim"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SECRET"
server-port = $PGRST_PORT
CONF
for f in /tmp/v2pg/postgrest.pid /tmp/v2pg/proxy.pid; do [ -f "$f" ] && kill "$(cat "$f")" 2>/dev/null || true; done
nohup /tmp/postgrest /tmp/v2pg/postgrest.conf > /tmp/v2pg/postgrest.log 2>&1 & echo $! > /tmp/v2pg/postgrest.pid
nohup node "$HERE/proxy.mjs" $PROXY_PORT $PGRST_PORT > /tmp/v2pg/proxy.log 2>&1 & echo $! > /tmp/v2pg/proxy.pid
for i in $(seq 1 50); do curl -s "http://localhost:$PROXY_PORT/rest/v1/" >/dev/null 2>&1 && break; sleep 0.2; done
echo "V2 local stack up: http://localhost:$PROXY_PORT (anon key: $(node "$HERE/anon-key.mjs" "$SECRET"))"
