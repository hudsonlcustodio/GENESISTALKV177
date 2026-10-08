#!/usr/bin/env bash
set -Eeuo pipefail
readonly CONTABO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
readonly GENESIS_ROOT="$(cd "$CONTABO_DIR/../.." && pwd -P)"
cd "$GENESIS_ROOT"
export REPO_URL=https://github.com/hudsonlcustodio/GENESISTALKV177.git
export GENESIS_CONTABO=1
source "$GENESIS_ROOT/hostgator-setup-kit/_common.sh"
fail_contabo() { printf 'BLOCKED: %s\n' "$*" >&2; exit 1; }
load_contabo() {
  [[ -f .env && ! -L .env ]] || fail_contabo 'Falta .env regular na raiz; use o template Contabo.'
  load_env .env
  export WAHA_IMAGE="${WAHA_IMAGE:-$(imagem_waha_padrao_para_host)}"
  [[ "${REVERSE_PROXY:-caddy}" == caddy ]] || fail_contabo 'Esta rota Contabo requer Caddy; proxy existente exige integração validada separadamente.'
  export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-genesis-talk}"
  [[ "$COMPOSE_PROJECT_NAME" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || fail_contabo 'COMPOSE_PROJECT_NAME inválido.'
  PROJECT_DIR="$GENESIS_ROOT"
  [[ "${SINGLE_SERVER:-0}" == 0 || "${SINGLE_SERVER:-0}" == 1 ]] || fail_contabo 'SINGLE_SERVER precisa ser 0 ou 1.'
}
genesis_compose() {
  local -a files=(-f "$GENESIS_ROOT/docker-compose.prod.yml")
  if [[ "${SINGLE_SERVER:-0}" == 1 ]]; then files+=(-f "$GENESIS_ROOT/docker-compose.single-server.yml"); fi
  files+=(-f "$CONTABO_DIR/docker-compose.genesis.yml")
  if ca_do_supabase_ok; then files+=(-f "$GENESIS_ROOT/docker-compose.supabase-ca.yml"); fi
  docker compose --project-directory "$GENESIS_ROOT" --env-file "$GENESIS_ROOT/.env" "${files[@]}" "$@"
}
validate_genesis_config() {
  # config contains secrets: keep it in memory, never print it or persist it.
  local config service
  config="$(genesis_compose --profile '*' config --format json 2>/dev/null)" || fail_contabo 'Compose inválido; confira o template e as variáveis.'
  for service in app worker scheduler voice-agent; do
    jq -e --arg s "$service" --arg image "genesis-talk-$service:1.77.0" \
      '.services[$s].image == $image and .services[$s].pull_policy == "never" and .services[$s].build.context != null' \
      <<< "$config" >/dev/null || fail_contabo "Compose de $service não usa build local Genesis."
  done
  jq -e '.services["voice-agent"].profiles | index("telefonia") != null' <<< "$config" >/dev/null \
    || fail_contabo 'Voice-agent sem profile telefonia.'
  printf '%s' "$config" | sha256sum | awk '{print $1}'
}
