#!/usr/bin/env bash
# Local RLS/RPC + migration test suite for Cycle Your Way.
#
# Runs ONLY against a throwaway PostgreSQL that it creates itself (temporary
# cluster via initdb), or against a disposable server given in PG_ADMIN_URL
# (superuser; the script creates and drops its own databases there).
# It never connects to Supabase staging or production.
#
# Usage:
#   supabase/tests/run-local.sh                # temp cluster (needs initdb/pg_ctl)
#   PG_ADMIN_URL=postgresql://postgres:postgres@localhost:5432/postgres supabase/tests/run-local.sh
#
# Checks:
#   1. baseline 7da22a3 -> legacy seed -> all migrations (and migrations re-run = idempotent)
#   2. RLS/RPC suite for anon / account A / account B (rls_rpc.test.sql)
#   3. schema.sql applied to a fresh DB (twice = idempotent)
#   4. drift: public schema from (1) equals public schema from (3)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPA="$(cd "$HERE/.." && pwd)"
MIGRATIONS=(
  "$SUPA/migrations/20261001_ride_idempotency.sql"
  "$SUPA/migrations/20261001_unlisted_route_sharing.sql"
  "$SUPA/migrations/20261001_account_stats.sql"
  "$SUPA/migrations/20261007_harden_sharing_and_rpc_grants.sql"
  "$SUPA/migrations/20261007_r07_data_constraints.sql"
)
WORK="$(mktemp -d)"
CLUSTER_STARTED=0

find_pg_bin() {
  if [[ -n "${PG_BIN:-}" ]]; then echo "$PG_BIN"; return; fi
  if command -v initdb >/dev/null 2>&1; then dirname "$(command -v initdb)"; return; fi
  local d
  d="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
  [[ -n "$d" ]] && echo "$d"
}

cleanup() {
  if [[ "$CLUSTER_STARTED" == 1 ]]; then
    run_as_pg "$PGB/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

run_as_pg() {
  # initdb refuses to run as root (e.g. in containers); drop to 'postgres' if needed.
  if [[ "$(id -u)" == 0 ]]; then
    chown -R postgres "$WORK" 2>/dev/null || true
    su postgres -s /bin/bash -c "$(printf '%q ' "$@")"
  else
    "$@"
  fi
}

if [[ -z "${PG_ADMIN_URL:-}" ]]; then
  PGB="$(find_pg_bin)"
  [[ -n "$PGB" && -x "$PGB/initdb" ]] || { echo "initdb not found; set PG_BIN or PG_ADMIN_URL" >&2; exit 2; }
  chmod 777 "$WORK"
  run_as_pg "$PGB/initdb" -D "$WORK/data" -U postgres -A trust --no-locale -E UTF8 >/dev/null
  run_as_pg "$PGB/pg_ctl" -D "$WORK/data" -o "-k $WORK -c listen_addresses='' -p 54329" -l "$WORK/pg.log" -w start >/dev/null
  CLUSTER_STARTED=1
  PG_ADMIN_URL="postgresql://postgres@/postgres?host=$WORK&port=54329"
fi

# Swap the database name in the admin URL (handles ".../postgres" and ".../postgres?host=...").
db_url() { echo "$PG_ADMIN_URL" | sed -E "s#/postgres(\?|\$)#/$1\1#"; }
psql_admin() { psql "$PG_ADMIN_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }
psql_db() { local db="$1"; shift; psql "$(db_url "$db")" -X -q -v ON_ERROR_STOP=1 "$@"; }

for db in cyw_migrated cyw_fresh; do
  psql_admin -c "drop database if exists $db" -c "create database $db"
done

echo "== 1. baseline 7da22a3 + legacy seed + migrations"
psql_db cyw_migrated -f "$HERE/supabase_shim.sql" >/dev/null
psql_db cyw_migrated -f "$HERE/fixtures/baseline_schema_7da22a3.sql" >/dev/null
psql_db cyw_migrated -f "$HERE/seed_legacy.sql" >/dev/null
for m in "${MIGRATIONS[@]}"; do
  echo "   apply $(basename "$m")"
  psql_db cyw_migrated -f "$m" >/dev/null
done
for m in "${MIGRATIONS[@]}"; do
  psql_db cyw_migrated -f "$m" >/dev/null
done
echo "   migrations re-applied cleanly (idempotent)"

echo "== 3. schema.sql on a fresh database (applied twice)"
psql_db cyw_fresh -f "$HERE/supabase_shim.sql" >/dev/null
psql_db cyw_fresh -f "$SUPA/schema.sql" >/dev/null
psql_db cyw_fresh -f "$SUPA/schema.sql" >/dev/null
echo "   ok"

echo "== 4. drift: migrated schema vs schema.sql"
# Column order differs legitimately (ALTER ADD COLUMN appends); compare normalised catalog facts.
catalog_facts() {
  psql_db "$1" -At <<'SQL'
select 'col ' || table_name || '.' || column_name || ' ' || data_type || ' null=' || is_nullable || ' def=' || coalesce(column_default, '')
  from information_schema.columns where table_schema = 'public'
union all
select 'idx ' || indexname || ' ' || regexp_replace(indexdef, '^CREATE (UNIQUE )?INDEX \S+ ', '')
  from pg_indexes where schemaname = 'public'
union all
select 'con ' || conrelid::regclass || ' ' || pg_get_constraintdef(oid)
  from pg_constraint where connamespace = 'public'::regnamespace
union all
select 'pol ' || tablename || ' ' || policyname || ' ' || cmd || ' ' || coalesce(qual, '') || ' | ' || coalesce(with_check, '')
  from pg_policies where schemaname = 'public'
union all
select 'fn ' || p.oid::regprocedure || ' secdef=' || p.prosecdef || ' cfg=' || coalesce(array_to_string(p.proconfig, ','), '')
       || ' acl=' || coalesce(array_to_string(p.proacl, ','), '') || ' md5=' || md5(btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g')))
  from pg_proc p where p.pronamespace = 'public'::regnamespace
union all
select 'trg ' || tgrelid::regclass || ' ' || pg_get_triggerdef(oid)
  from pg_trigger where not tgisinternal and tgrelid::regclass::text like 'public.%'
union all
select 'rls ' || relname || ' ' || relrowsecurity
  from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
order by 1;
SQL
}
if diff -u <(catalog_facts cyw_migrated) <(catalog_facts cyw_fresh) > "$WORK/drift.diff"; then
  echo "   no drift"
else
  echo "   DRIFT between baseline+migrations and schema.sql:" >&2
  cat "$WORK/drift.diff" >&2
  exit 1
fi

echo "== 2. RLS/RPC suite (anon / A / B)"
psql_db cyw_migrated -f "$HERE/test_helpers.sql" >/dev/null
psql_db cyw_migrated -f "$HERE/rls_rpc.test.sql" >/dev/null

psql_db cyw_migrated -At -F $'\t' -c \
  "select status, message, coalesce(detail, '') from t.results order by id" |
  awk -F'\t' '{ d = ($3 != "" && $1 != "PASS") ? "  [" $3 "]" : ""; printf "   %-4s %s%s\n", $1, $2, d }'

read -r pass fail gap < <(psql_db cyw_migrated -At -F ' ' -c \
  "select count(*) filter (where status='PASS'), count(*) filter (where status='FAIL'), count(*) filter (where status='GAP') from t.results")
echo "== result: PASS=$pass FAIL=$fail GAP(known)=$gap"
[[ "$fail" == 0 ]]
