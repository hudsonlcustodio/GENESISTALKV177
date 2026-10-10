#!/usr/bin/env bash
# Application rollback only. Database downgrade is deliberately not attempted.
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
load_contabo
recusar_projeto_de_outra_arvore || fail_contabo 'Outra instalação ocupa este projeto Docker.'
validate_genesis_config >/dev/null
record="${1:-}"
[[ "$record" =~ ^\.runtime/contabo/[0-9]{8}T[0-9]{6}Z$ && -d "$record" && ! -L "$record" ]] \
  || fail_contabo 'Uso: rollback.sh .runtime/contabo/DATA_UTC (registro desta instalação).'
[[ -f "$record/previous-images" && -f "$record/schema-before.json" ]] \
  || fail_contabo 'Registro sem imagens ou contrato de schema anterior; rollback automático recusado.'
umask 077
exec 9>.runtime/contabo/deploy.lock
flock -n 9 || fail_contabo 'Deploy/rollback já em andamento.'
pg_container -i postgres:17-alpine psql "$(url_do_schema)" -X -qAt -v ON_ERROR_STOP=1 \
  < hostgator-setup-kit/recovery-catalog.sql > "$record/schema-at-rollback.json"
cmp -s "$record/schema-before.json" "$record/schema-at-rollback.json" \
  || { [[ -f "$record/additive-compatibility-proof" && -f "$record/schema-rollback-compatible.json" ]] \
    && cmp -s "$record/schema-rollback-compatible.json" "$record/schema-at-rollback.json"; } \
  || fail_contabo 'Schema/permissões mudaram desde a imagem anterior; valide compatibilidade em clone isolado.'
services=(); images=(); declare -A seen=()
while read -r service image extra; do
  case "$service" in app|worker|scheduler|voice-agent) ;; *) fail_contabo 'Serviço inválido no registro.';; esac
  [[ -z "$extra" && "$image" =~ ^sha256:[a-f0-9]{64}$ && -z "${seen[$service]:-}" ]] \
    || fail_contabo 'Registro de imagens inválido ou repetido.'
  docker image inspect "$image" >/dev/null || fail_contabo "Imagem anterior de $service indisponível."
  seen[$service]=1; services+=("$service"); images+=("$image")
done < "$record/previous-images"
for required in app worker scheduler; do
  [[ -n "${seen[$required]:-}" ]] || fail_contabo "Registro não contém $required."
done
started="$(date +%s)"; stamp="$(date -u +%Y%m%dT%H%M%SZ)"
for index in "${!services[@]}"; do
  service="${services[$index]}"
  current="$(docker image inspect "genesis-talk-$service:1.77.0" --format '{{.Id}}')"
  docker tag "$current" "genesis-talk-$service:before-rollback-$stamp"
done
for index in "${!services[@]}"; do
  docker tag "${images[$index]}" "genesis-talk-${services[$index]}:1.77.0"
done
genesis_compose up -d --no-build --wait --wait-timeout 300 "${services[@]}" \
  > "$record/rollback-up-$stamp.log" 2>&1 || fail_contabo 'Rollback não ficou saudável; imagens de resgate preservadas.'
bash "$CONTABO_DIR/smoke.sh" > "$record/rollback-smoke-$stamp.log" 2>&1 \
  || fail_contabo 'Smoke do rollback falhou; consulte o registro protegido.'
printf 'PASS: rollback de aplicação em %s segundos; dados preservados.\n' "$(( $(date +%s)-started ))"
