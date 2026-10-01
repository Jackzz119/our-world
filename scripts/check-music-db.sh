#!/usr/bin/env bash
# check-music-db.sh — offline check of the Supabase migrations: starts a throwaway local Postgres,
# loads a minimal stand-in for Supabase's auth/storage schemas (scripts/music-db/supabase-stub.sql),
# applies every file in supabase/migrations twice (they must be re-runnable), then runs every pgTAP
# test in supabase/tests/database. Exits non-zero on any failure.
#
# Needs PostgreSQL 15+ server binaries and pgTAP (Ubuntu: apt install postgresql-16 postgresql-16-pgtap).
# Usage: bash scripts/check-music-db.sh   (PG_BIN overrides the server bin dir, PG_PORT the port)
# The same tests run against a real local Supabase with `supabase test db`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PORT="${PG_PORT:-54329}"
WORK="$(mktemp -d)"

if [ -z "$PG_BIN" ] || [ ! -x "$PG_BIN/initdb" ]; then
    echo "PostgreSQL server binaries not found; set PG_BIN" >&2
    exit 2
fi

# Postgres refuses to run as root: hand the cluster to the postgres user in that case.
as_pg() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$WORK"

cleanup() {
    as_pg "$PG_BIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
    rm -rf "$WORK"
}
trap cleanup EXIT

as_pg "$PG_BIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
as_pg "$PG_BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=" -l "$WORK/log" -w start >/dev/null

# Keep re-run notices ("already exists, skipping") out of the report.
export PGOPTIONS="-c client_min_messages=warning"
PSQL=(psql -h "$WORK" -p "$PORT" -U postgres -d postgres -X -q -v ON_ERROR_STOP=1)

"${PSQL[@]}" -f "$ROOT/scripts/music-db/supabase-stub.sql"
for pass in 1 2; do
    for migration in "$ROOT"/supabase/migrations/*.sql; do
        "${PSQL[@]}" -f "$migration"
    done
    echo "migrations applied (pass $pass)"
done

failed=0
for test in "$ROOT"/supabase/tests/database/*.test.sql; do
    out="$("${PSQL[@]}" -t -A -f "$test")"
    echo "$out"
    if grep -q '^not ok' <<<"$out" || ! grep -q '^1\.\.' <<<"$out" || grep -q '^# Looks like' <<<"$out"; then
        failed=1
    fi
done

if [ "$failed" != 0 ]; then
    echo "music db check FAILED" >&2
    exit 1
fi
echo "music db check passed"
