#!/usr/bin/env bash
# Runs the migration and the SupabaseStore integration test against a throwaway
# local Postgres + PostgREST (no Supabase account needed). Linux, Postgres 16.
#   PG_BIN=/usr/lib/postgresql/16/bin ./scripts/test-supabase-local.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
WORK="${WORK:-/var/tmp/mib-supabase-test}"
PORT=54330; REST=3310; PROXY=3311
SECRET="local-test-jwt-secret-0123456789-abcdefghijkl"
PGRST_VERSION="v12.2.3"

rm -rf "$WORK"; mkdir -p "$WORK"
RUN=""; if [ "$(id -u)" = "0" ]; then id postgres >/dev/null 2>&1 || useradd -r postgres; chown postgres "$WORK"; RUN="su postgres -c"; fi
start_pg="$PG_BIN/initdb -D $WORK/data -A trust -U postgres >/dev/null && $PG_BIN/pg_ctl -D $WORK/data -o '-p $PORT -k $WORK' -l $WORK/pg.log start >/dev/null"
if [ -n "$RUN" ]; then $RUN "$start_pg"; else bash -c "$start_pg"; fi
cleanup() { kill "${PGRST_PID:-0}" "${PROXY_PID:-0}" 2>/dev/null || true; if [ -n "$RUN" ]; then $RUN "$PG_BIN/pg_ctl -D $WORK/data stop -m fast >/dev/null"; else "$PG_BIN/pg_ctl" -D "$WORK/data" stop -m fast >/dev/null; fi; }
trap cleanup EXIT
sleep 1
PSQL="psql -h $WORK -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -f "$ROOT/supabase/test-stubs.sql"
for pass in 1 2; do
  for m in "$ROOT"/supabase/migrations/*.sql; do $PSQL -f "$m" >/dev/null 2>&1; done
done
echo "migrations apply and re-apply cleanly"

if [ ! -x "$WORK/../postgrest-$PGRST_VERSION" ]; then
  curl -sSL "https://github.com/PostgREST/postgrest/releases/download/$PGRST_VERSION/postgrest-$PGRST_VERSION-linux-static-x64.tar.xz" | tar -xJ -C "$(dirname "$WORK")"
  mv "$(dirname "$WORK")/postgrest" "$WORK/../postgrest-$PGRST_VERSION"
fi
cat > "$WORK/pgrst.conf" <<CONF
db-uri = "postgres://postgres@/postgres?host=$WORK&port=$PORT"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SECRET"
server-port = $REST
CONF
"$WORK/../postgrest-$PGRST_VERSION" "$WORK/pgrst.conf" > "$WORK/pgrst.log" 2>&1 & PGRST_PID=$!
node -e "require('http').createServer((q,s)=>{const p=require('http').request({host:'127.0.0.1',port:$REST,path:q.url.replace(/^\/rest\/v1/,'')||'/',method:q.method,headers:{...q.headers,host:'127.0.0.1'}},r=>{s.writeHead(r.statusCode,r.headers);r.pipe(s)});p.on('error',e=>{s.writeHead(502);s.end(String(e))});q.pipe(p)}).listen($PROXY)" & PROXY_PID=$!
sleep 2
JWT=$(node -e "const c=require('crypto'),b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');const h=b({alg:'HS256',typ:'JWT'}),p=b({role:'service_role',exp:Math.floor(Date.now()/1000)+3600});console.log(h+'.'+p+'.'+c.createHmac('sha256','$SECRET').update(h+'.'+p).digest('base64url'))")
cd "$ROOT"
SUPABASE_TEST_URL="http://127.0.0.1:$PROXY" SUPABASE_TEST_KEY="$JWT" SUPABASE_TEST_USERS="11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222" \
  pnpm vitest run src/lib/data/supabase-store.integration.test.ts
