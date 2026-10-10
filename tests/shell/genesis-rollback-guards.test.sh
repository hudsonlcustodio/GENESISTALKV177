#!/usr/bin/env bash
# Exercise the real rollback CLI with a bounded Docker double. Image boot and
# PostgreSQL recovery are separate gates; these checks prove refusal/order.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/deploy/contabo" "$WORK/hostgator-setup-kit" "$WORK/.runtime/contabo/20261010T120000Z" "$WORK/bin"
cp "$ROOT/deploy/contabo/rollback.sh" "$WORK/deploy/contabo/rollback.sh"
cp "$ROOT/hostgator-setup-kit/recovery-catalog.sql" "$WORK/hostgator-setup-kit/recovery-catalog.sql"
export ROLLBACK_TEST_ROOT="$WORK" ROLLBACK_TEST_LOG="$WORK/calls"
cat > "$WORK/deploy/contabo/common.sh" <<'COMMON'
set -Eeuo pipefail
CONTABO_DIR="$ROLLBACK_TEST_ROOT/deploy/contabo"; cd "$ROLLBACK_TEST_ROOT"
fail_contabo() { echo "BLOCKED: $*" >&2; exit 1; }
load_contabo() { :; }
validate_genesis_config() { :; }
recusar_projeto_de_outra_arvore() { [[ "${FOREIGN_PROJECT:-0}" == 0 ]]; }
url_do_schema() { printf 'postgresql://isolated/fixture'; }
pg_container() { cat >/dev/null; printf '%s\n' "${CATALOG:-contract-before}"; }
genesis_compose() { printf 'compose %s\n' "$*" >> "$ROLLBACK_TEST_LOG"; }
COMMON
cat > "$WORK/deploy/contabo/smoke.sh" <<'SMOKE'
#!/usr/bin/env bash
printf 'smoke\n' >> "$ROLLBACK_TEST_LOG"
exit "${SMOKE_EXIT:-0}"
SMOKE
cat > "$WORK/bin/docker" <<'DOCKER'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$ROLLBACK_TEST_LOG"
case "$1 $2" in
  'image inspect') printf 'sha256:%064d\n' 1;;
esac
DOCKER
chmod +x "$WORK/bin/docker"
export PATH="$WORK/bin:$PATH"
record="$WORK/.runtime/contabo/20261010T120000Z"
printf 'contract-before\n' > "$record/schema-before.json"
for service in app worker scheduler; do printf '%s sha256:%064d\n' "$service" 1; done > "$record/previous-images"
run() { bash "$WORK/deploy/contabo/rollback.sh" .runtime/contabo/20261010T120000Z > "$WORK/result" 2>&1; }
run
grep -q 'PASS: rollback' "$WORK/result"
grep -q 'compose up -d --no-build --wait' "$WORK/calls"
grep -q 'before-rollback-' "$WORK/calls"
grep -q '^smoke$' "$WORK/calls"
: > "$WORK/calls"
export CATALOG=changed
if run; then echo 'FAIL: drift accepted'; exit 1; fi
! grep -q '^tag ' "$WORK/calls"
printf 'changed\n' > "$record/schema-rollback-compatible.json"
printf 'proved additive delta\n' > "$record/additive-compatibility-proof"
run
export CATALOG=unexpected
if run; then echo 'FAIL: drift after additive proof accepted'; exit 1; fi
export CATALOG=contract-before FOREIGN_PROJECT=1
: > "$WORK/calls"
if run; then echo 'FAIL: foreign project accepted'; exit 1; fi
[[ ! -s "$WORK/calls" ]]
export FOREIGN_PROJECT=0 SMOKE_EXIT=1
if run; then echo 'FAIL: failed smoke accepted'; exit 1; fi
grep -q 'Smoke do rollback falhou' "$WORK/result"
export SMOKE_EXIT=0
printf 'other sha256:%064d\n' 1 >> "$record/previous-images"
: > "$WORK/calls"
if run; then echo 'FAIL: unexpected service accepted'; exit 1; fi
! grep -q '^tag ' "$WORK/calls"
printf 'PASS: rollback CLI, additive proof, schema drift, project ownership, failed smoke and service validation.\n'
