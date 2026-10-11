#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
fresh=0
case "${1:-}" in --fresh) fresh=1;; '') ;; *) fail_contabo 'Uso: deploy.sh [--fresh]';; esac
bash "$CONTABO_DIR/preflight.sh"
load_contabo
umask 077
mkdir -p .runtime/contabo
exec 9>.runtime/contabo/deploy.lock
flock -n 9 || fail_contabo 'Já existe um deploy em andamento.'
trap 'printf "BLOCKED: deploy falhou na linha %s; stack/volumes preservados. Consulte os logs protegidos em .runtime/contabo.\n" "$LINENO" >&2' ERR
config_hash="$(validate_genesis_config)"
sha="$(git rev-parse HEAD)"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
record=".runtime/contabo/$stamp"
mkdir -p "$record"
pg_container -i postgres:17-alpine psql "$(url_do_schema)" -X -qAt -v ON_ERROR_STOP=1 \
  < hostgator-setup-kit/recovery-catalog.sql > "$record/schema-before.json" \
  || fail_contabo 'Contrato de schema indisponível antes do deploy.'
printf 'version=1.77.0\ncommit=%s\ncompose_sha256=%s\n' "$sha" "$config_hash" > "$record/provenance"
genesis_functions_before="$(pg_container postgres:17-alpine psql "$(url_do_schema)" -X -qAt -v ON_ERROR_STOP=1 -c \
  "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('fn_genesis_supervisao','fn_genesis_nomes_do_roster','fn_genesis_operator_counts');")"
existing="$(genesis_compose ps -aq)"
if [[ -n "$existing" || $fresh == 0 ]]; then
  [[ $fresh == 0 ]] || fail_contabo '--fresh recusado: já existem containers nesta instalação.'
  # Existing database requires backup even if containers are currently absent.
  BACKUP_DIR="$GENESIS_ROOT/backups/$stamp" bash hostgator-setup-kit/backup.sh > "$record/backup.log" 2>&1 \
    || fail_contabo "Backup falhou; consulte $record/backup.log no servidor."
  find "backups/$stamp" -type f -exec sha256sum {} + > "$record/backup.sha256"
  [[ -s "$record/backup.sha256" ]] || fail_contabo 'Backup sem artefatos.'
  mapfile -t bundles < <(find "backups/$stamp" -maxdepth 1 -name 'db-*.sql.gz' -type f)
  [[ ${#bundles[@]} == 1 ]] || fail_contabo 'Backup precisa de um bundle completo.'
  python3 hostgator-setup-kit/recovery.py verify "${bundles[0]}" > "$record/backup-verified" \
    || fail_contabo 'Manifesto/integridade de recuperação reprovou.'
fi
services=(app worker scheduler)
case ",${COMPOSE_PROFILES:-}," in *,telefonia,*) services+=(voice-agent);; esac
for service in "${services[@]}"; do
  id="$(genesis_compose ps -aq "$service")"
  if [[ -n "$id" ]]; then
    old="$(docker inspect "$id" --format '{{.Image}}')"
    docker tag "$old" "genesis-talk-$service:rollback-$stamp"
    printf '%s %s\n' "$service" "$old" >> "$record/previous-images"
  fi
done
genesis_compose build "${services[@]}" > "$record/build.log" 2>&1 || fail_contabo "Build falhou; consulte $record/build.log."
for service in "${services[@]}"; do
  docker image inspect "genesis-talk-$service:1.77.0" --format '{{.Id}}' >> "$record/images"
  docker tag "genesis-talk-$service:1.77.0" "genesis-talk-$service:commit-$sha"
done
if [[ $fresh == 1 ]]; then
  owner_password="${OWNER_PASSWORD:-}"
  [[ -n "${OWNER_EMAIL:-}" && ${#owner_password} -ge 16 ]] || fail_contabo '--fresh exige OWNER_EMAIL e senha inicial com 16 caracteres.'
  tables="$(pg_container postgres:17-alpine psql "$(url_do_schema)" -Atqc "select count(*) from pg_tables where schemaname='public';" 2> "$record/database.log")"
  [[ "$tables" == 0 ]] || fail_contabo '--fresh exige schema public vazio; nenhum banco existente será sobrescrito.'
  # Same extension prelude as install.sh; baseline assumes these exist.
  pg_container postgres:17-alpine psql "$(url_do_schema)" -v ON_ERROR_STOP=1 -c \
    'create extension if not exists vector with schema public; create extension if not exists citext with schema public; create extension if not exists pg_trgm with schema public;' \
    >> "$record/database.log" 2>&1 || fail_contabo 'Não foi possível preparar extensions da baseline.'
  # Same canonical baseline and PostgreSQL helper used by the upstream kit.
  pg_container -i postgres:17-alpine psql "$(url_do_schema)" -v ON_ERROR_STOP=1 < supabase/baseline.sql >> "$record/database.log" 2>&1 \
    || fail_contabo "Baseline falhou; consulte $record/database.log. Não repita --fresh sobre schema parcial."
  # For single-server, bootstrap must reach Auth internally before Caddy has TLS.
  genesis_compose run --rm --no-deps -e NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_SERVER_URL:-$NEXT_PUBLIC_SUPABASE_URL}" worker \
    pnpm exec tsx scripts/bootstrap-owner.ts > "$record/bootstrap.log" 2>&1 || fail_contabo "Bootstrap falhou; consulte $record/bootstrap.log."
fi
if [[ $fresh == 0 ]]; then
  # This candidate adds only these three functions to the v1.77 baseline.
  # Apply the versioned delta transactionally; never report an image-only
  # update as complete while its RPCs are absent.
  genesis_compose stop "${services[@]}" > "$record/pause.log" 2>&1 \
    || fail_contabo 'Não foi possível pausar os serviços desta instalação.'
  if ! pg_container -i postgres:17-alpine psql "$(url_do_schema)" -X \
    -v ON_ERROR_STOP=1 --single-transaction \
    < supabase/migrations/20261010120000_0613_supervisao_com_populacao.sql \
    > "$record/database.log" 2>&1; then
    fail_contabo "Migração reverteu; serviços permanecem pausados. Confira $record/database.log antes de retomar."
  fi
fi
pg_container -i postgres:17-alpine psql "$(url_do_schema)" -X -qAt -v ON_ERROR_STOP=1 \
  < hostgator-setup-kit/recovery-catalog.sql > "$record/schema-after.json"
cp "$record/schema-before.json" "$record/schema-rollback-compatible.json"
if [[ $fresh == 0 && "$genesis_functions_before" == 0 ]]; then
  # A first installation of delta 0613 adds only three new functions. Prove
  # that EVERYTHING else (owners, ACL, RLS, tables, policies) is unchanged
  # before accepting the post-delta schema with the previous images.
  python3 "$CONTABO_DIR/rollback-catalog.py" \
    | pg_container -i postgres:17-alpine psql "$(url_do_schema)" -X -qAt -v ON_ERROR_STOP=1 \
    > "$record/schema-without-additions.json"
  if cmp -s "$record/schema-before.json" "$record/schema-without-additions.json"; then
    cp "$record/schema-after.json" "$record/schema-rollback-compatible.json"
    printf 'Only three previously absent Genesis functions were added; previous contract preserved.\n' > "$record/additive-compatibility-proof"
  fi
fi
genesis_compose up -d --no-build --wait --wait-timeout 300 > "$record/up.log" 2>&1 || fail_contabo "Stack não ficou saudável; consulte $record/up.log."
bash "$CONTABO_DIR/smoke.sh" > "$record/smoke.log" 2>&1 || fail_contabo "Smoke reprovou; consulte $record/smoke.log."
printf 'PASS: deploy manual Genesis 1.77.0, commit %s. Evidência protegida: %s\n' "$sha" "$record"
