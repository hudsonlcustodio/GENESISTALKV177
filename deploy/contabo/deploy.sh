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
printf 'version=1.77.0\ncommit=%s\ncompose_sha256=%s\n' "$sha" "$config_hash" > "$record/provenance"
existing="$(genesis_compose ps -aq)"
if [[ -n "$existing" || $fresh == 0 ]]; then
  [[ $fresh == 0 ]] || fail_contabo '--fresh recusado: já existem containers nesta instalação.'
  # Existing database requires backup even if containers are currently absent.
  BACKUP_DIR="$GENESIS_ROOT/backups/$stamp" bash hostgator-setup-kit/backup.sh > "$record/backup.log" 2>&1 \
    || fail_contabo "Backup falhou; consulte $record/backup.log no servidor."
  find "backups/$stamp" -type f -exec sha256sum {} + > "$record/backup.sha256"
  [[ -s "$record/backup.sha256" ]] || fail_contabo 'Backup sem artefatos.'
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
genesis_compose up -d --no-build --wait --wait-timeout 300 > "$record/up.log" 2>&1 || fail_contabo "Stack não ficou saudável; consulte $record/up.log."
bash "$CONTABO_DIR/smoke.sh" > "$record/smoke.log" 2>&1 || fail_contabo "Smoke reprovou; consulte $record/smoke.log."
printf 'PASS: deploy manual Genesis 1.77.0, commit %s. Evidência protegida: %s\n' "$sha" "$record"
