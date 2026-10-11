#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
[[ "$(uname -s)" == Linux ]] || fail_contabo 'Execute na VPS Linux, não no Windows/Git Bash.'
arquitetura_suportada_pelo_kit "$(uname -m)" || fail_contabo 'Arquitetura não suportada (use amd64/arm64).'
for tool in docker git curl openssl jq ss getent stat awk df sha256sum gzip tar flock python3; do
  command -v "$tool" >/dev/null || fail_contabo "Ferramenta ausente: $tool."
done
docker info >/dev/null 2>&1 || fail_contabo 'Docker daemon indisponível ou sem permissão.'
docker compose version >/dev/null || fail_contabo 'Docker Compose indisponível.'
mem_kb="$(awk '/MemTotal:/ {print $2}' /proc/meminfo)"
[[ "$mem_kb" -ge 3500000 ]] || fail_contabo 'Build local exige aproximadamente 4 GB RAM; 8 GB recomendados. Não force esta VPS.'
[[ "$mem_kb" -ge 7500000 ]] || printf 'AVISO: 8 GB RAM recomendados; confira memória/swap para o build.\n'
disk_kb="$(df -Pk "$GENESIS_ROOT" | awk 'NR==2 {print $4}')"
[[ "$disk_kb" -ge 20971520 ]] || fail_contabo 'Reserve 20 GiB livres para builds/backups; este é um guardrail operacional, não uma medição de capacidade.'
[[ -f /etc/os-release ]] || fail_contabo 'Distribuição Linux não identificada.'
printf 'CPU: %s; arquitetura: %s; RAM: %s MiB; swap: %s MiB\n' "$(getconf _NPROCESSORS_ONLN)" "$(uname -m)" "$((mem_kb / 1024))" "$(awk '/SwapTotal:/ {print int($2/1024)}' /proc/meminfo)"
[[ "${1:-}" == --host-only ]] && exit 0
[[ $# == 0 ]] || fail_contabo 'Argumento desconhecido no preflight.'
load_contabo
[[ "$(stat -c '%a' .env)" == 600 && "$(stat -c '%u' .env)" == "$(id -u)" ]] \
  || fail_contabo '.env precisa pertencer ao operador e ter chmod 600.'
for key in DOMAIN ACME_EMAIL NEXT_PUBLIC_APP_URL NEXT_PUBLIC_ADMIN_URL NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_DB_URL INTERNAL_SECRET CPF_ENCRYPTION_KEY WAHA_BYO_ENCRYPTION_KEY AI_CRED_AES_KEY WAHA_API_KEY WAHA_API_KEY_SHA512 WAHA_HMAC_SECRET SRH_TOKEN UPSTASH_REDIS_REST_TOKEN; do
  value="${!key:-}"
  [[ -n "$value" && ! "${value,,}" =~ (example|placeholder|changeme|seudominio|your_|replace|\.invalid|\.\.\.) ]] \
    || fail_contabo "Variável ausente ou placeholder: $key (valor omitido)."
done
[[ "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ && "$DOMAIN" == *.* ]] || fail_contabo 'DOMAIN inválido.'
[[ "$NEXT_PUBLIC_APP_URL" == "https://$DOMAIN" && "$NEXT_PUBLIC_ADMIN_URL" == "https://$DOMAIN" ]] || fail_contabo 'URLs públicas precisam corresponder ao domínio HTTPS.'
[[ "$NEXT_PUBLIC_SUPABASE_URL" == https://* ]] || fail_contabo 'Supabase público deve usar HTTPS.'
[[ "$SUPABASE_SERVICE_ROLE_KEY" != "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]] || fail_contabo 'Anon e service role não podem ser a mesma chave.'
supabase_key_role_ok "$NEXT_PUBLIC_SUPABASE_ANON_KEY" anon || fail_contabo 'NEXT_PUBLIC_SUPABASE_ANON_KEY precisa ser anon/publicável; credencial privilegiada recusada.'
supabase_key_role_ok "$SUPABASE_SERVICE_ROLE_KEY" service_role || fail_contabo 'SUPABASE_SERVICE_ROLE_KEY precisa ser service_role/secret.'
for key in INTERNAL_SECRET CPF_ENCRYPTION_KEY WAHA_BYO_ENCRYPTION_KEY WAHA_HMAC_SECRET; do
  value="${!key}"
  [[ "${#value}" -ge 32 ]] || fail_contabo "Segredo muito curto: $key."
done
[[ "$(printf '%s' "$AI_CRED_AES_KEY" | openssl base64 -d -A 2>/dev/null | wc -c)" == 32 ]] || fail_contabo 'AI_CRED_AES_KEY deve codificar 32 bytes em base64.'
[[ "${WAHA_WEBHOOK_REQUIRE_SIGNATURE:-}" == true ]] || fail_contabo 'Assinatura WAHA precisa estar habilitada.'
hash="$(printf '%s' "$WAHA_API_KEY" | openssl dgst -sha512 | awk '{print $NF}')"
[[ "$hash" == "$WAHA_API_KEY_SHA512" ]] || fail_contabo 'Hash SHA512 do WAHA não corresponde à chave.'
[[ "$SRH_TOKEN" == "$UPSTASH_REDIS_REST_TOKEN" ]] || fail_contabo 'Tokens de Redis/SRH não correspondem.'
[[ "$WAHA_API_BASE_URL" == http://waha:3000 && "$WAHA_WEBHOOK_BASE_URL" == http://app:3000 && "$UPSTASH_REDIS_REST_URL" == http://srh:80 ]] || fail_contabo 'URLs internas WAHA/SRH devem corresponder aos serviços da stack.'
if [[ "${SINGLE_SERVER:-0}" == 1 ]]; then
  [[ -f .runtime/supabase/.env ]] || fail_contabo 'Prepare o Supabase com install.sh --single-server --domain DOMINIO.'
fi
recusar_projeto_de_outra_arvore || fail_contabo 'Outra instalação ocupa este projeto Docker.'
for port in 80 443; do
  if [[ -n "$(ss -H -ltn "sport = :$port")" ]]; then
    id="$(genesis_compose ps -q caddy)"
    [[ -n "$id" ]] && docker inspect "$id" --format '{{json .NetworkSettings.Ports}}' | jq -e --arg p "$port" '.[$p + "/tcp"] | any(.HostPort == $p)' >/dev/null \
      || fail_contabo "Porta $port ocupada por outro serviço; não será interrompido."
  fi
done
addresses="$(getent ahostsv4 "$DOMAIN" | awk '{print $1}' | sort -u)"
[[ -n "$addresses" ]] || fail_contabo 'DNS A não resolvido.'
public_ip="$(curl --fail --silent --show-error --max-time 10 https://api.ipify.org)" || fail_contabo 'Não foi possível verificar o IP público.'
[[ "$public_ip" =~ ^[0-9.]+$ ]] || fail_contabo 'IP público inválido.'
grep -Fxq "$public_ip" <<< "$addresses" || fail_contabo 'DNS A não aponta para esta VPS; configure DNS direto antes do deploy.'
git rev-parse --verify HEAD >/dev/null || fail_contabo 'Source precisa estar versionado.'
[[ -z "$(git status --porcelain)" ]] || fail_contabo 'Working tree suja: versione o source antes do deploy.'
origin="$(git remote get-url origin)"
[[ "${origin%.git}" == https://github.com/hudsonlcustodio/GENESISTALKV177 ]] || fail_contabo 'Remote origin não é o repo Genesis.'
validate_genesis_config >/dev/null
printf 'PASS: preflight Contabo (nenhum segredo exibido).\n'
