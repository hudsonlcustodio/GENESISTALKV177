#!/usr/bin/env bash
# CLI guards. Real SQL/ACL/count rollback: genesis-recovery-rehearsal.mjs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
source "$ROOT/tests/shell/recovery-v2-stub.sh"
mkdir -p "$WORK/project/backups" "$WORK/bin"
touch "$WORK/project/docker-compose.prod.yml"
printf 'SUPABASE_DB_URL="postgresql://postgres:fixture@isolated/postgres"\n' > "$WORK/project/.env"
export RESTORE_CALLS="$WORK/calls"
cat > "$WORK/bin/docker" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$RESTORE_CALLS"
case " $* " in
  *"server_version_num"*) printf '17\n'; exit 0 ;;
  *"pg_tables"*) printf '%s\n' "${TARGET_COUNT:-0}"; exit 0 ;;
  *"psql"*)
    case " $* " in *"ON_ERROR_STOP=1"*"--single-transaction"*) ;; *) exit 10;; esac
    cat >/dev/null
    exit "${RESTORE_SQL_EXIT:-0}" ;;
esac
STUB
chmod +x "$WORK/bin/docker"
export PATH="$WORK/bin:$PATH"
dump="$WORK/project/backups/db-fixture.sql.gz"
make_recovery_fixture "$dump" "$ROOT/hostgator-setup-kit"
cd "$WORK/project"
run_restore() { printf 'RESTAURAR\n' | bash "$ROOT/hostgator-setup-kit/restore.sh" "$dump" > "$WORK/output" 2>&1; }
TARGET_COUNT=1; export TARGET_COUNT
if run_restore; then echo 'FAIL: occupied target accepted'; exit 1; fi
grep -q 'Destino já tem' "$WORK/output"
! grep -q -- '--single-transaction' "$RESTORE_CALLS"
TARGET_COUNT=0; export TARGET_COUNT
RESTORE_SQL_EXIT=3; export RESTORE_SQL_EXIT
if run_restore; then echo 'FAIL: SQL error accepted'; exit 1; fi
grep -q 'transação foi revertida' "$WORK/output"
! grep -q 'banco restaurado' "$WORK/output"
RESTORE_SQL_EXIT=0; export RESTORE_SQL_EXIT
run_restore
grep -q 'banco restaurado' "$WORK/output"
printf 'corruption' >> "$dump"
: > "$RESTORE_CALLS"
if run_restore; then echo 'FAIL: corrupted dump accepted'; exit 1; fi
[[ ! -s "$RESTORE_CALLS" ]]
printf 'PASS: occupied destination, SQL failure and corrupted bundle fail closed; compatible restore succeeds.\n'
