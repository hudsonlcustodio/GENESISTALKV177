#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
case "${1:-}" in
  --external)
    [[ $# == 1 ]] || fail_contabo 'Uso: install.sh --external'
    # External Supabase must exist and have an empty public schema; the wrapper
    # applies the canonical baseline and bootstraps the first owner.
    exec bash "$CONTABO_DIR/deploy.sh" --fresh
    ;;
  --single-server)
    [[ $# == 3 && "$2" == --domain ]] || fail_contabo 'Uso: install.sh --single-server --domain DOMINIO'
    domain="$3"
    bash "$CONTABO_DIR/preflight.sh" --host-only
    [[ ! -f .env && ! -d .runtime/supabase ]] || fail_contabo 'Bootstrap single-server exige instalação nova. Não sobrescreva credenciais; use deploy.sh para atualização.'
    [[ "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ && "$domain" == *.* ]] || fail_contabo 'Domínio inválido.'
    for port in 80 443; do
      [[ -z "$(ss -H -ltn "sport = :$port")" ]] || fail_contabo "Porta $port já ocupada."
    done
    addresses="$(getent ahostsv4 "$domain" | awk '{print $1}' | sort -u)"
    public_ip="$(curl --fail --silent --show-error --max-time 10 https://api.ipify.org)"
    grep -Fxq "$public_ip" <<< "$addresses" || fail_contabo 'DNS A precisa apontar para esta VPS antes do bootstrap.'
    # Upstream kit pins Supabase, creates its private network, env and credentials.
    umask 077
    mkdir -p .runtime/contabo
    bash hostgator-setup-kit/install-single-server.sh --prepare-only --domain "$domain" > .runtime/contabo/supabase-prepare.log 2>&1 \
      || fail_contabo 'Preparação Supabase falhou; log protegido em .runtime/contabo/supabase-prepare.log.'
    for key in INTERNAL_SECRET CPF_ENCRYPTION_KEY WAHA_BYO_ENCRYPTION_KEY WAHA_API_KEY WAHA_HMAC_SECRET SRH_TOKEN; do
      set_env_var .env "$key" "$(openssl rand -hex 32)"
    done
    set_env_var .env AI_CRED_AES_KEY "$(openssl rand -base64 32)"
    load_env .env
    set_env_var .env WAHA_API_KEY_SHA512 "$(printf '%s' "$WAHA_API_KEY" | openssl dgst -sha512 | awk '{print $NF}')"
    set_env_var .env UPSTASH_REDIS_REST_TOKEN "$SRH_TOKEN"
    set_env_var .env UPSTASH_REDIS_REST_URL http://srh:80
    set_env_var .env WAHA_API_BASE_URL http://waha:3000
    set_env_var .env WAHA_WEBHOOK_BASE_URL http://app:3000
    set_env_var .env WAHA_WEBHOOK_REQUIRE_SIGNATURE true
    set_env_var .env SUPABASE_SERVER_URL http://supabase-envoy:8000
    set_env_var .env NEXT_PUBLIC_APP_URL "https://$domain"
    set_env_var .env NEXT_PUBLIC_ADMIN_URL "https://$domain"
    set_env_var .env APP_NAME 'GENESIS TALK'
    # Keep the kit's directory-derived project name: its private network was
    # already provisioned with that identity. No global fixed network aliases.
    set_env_var .env COMPOSE_PROJECT_NAME "$(nome_do_projeto_atual)"
    set_env_var .env COMPOSE_PROFILES ''
    chmod 600 .env
    exec bash "$CONTABO_DIR/deploy.sh" --fresh
    ;;
  *) fail_contabo 'Uso: install.sh --external | --single-server --domain DOMINIO' ;;
esac
