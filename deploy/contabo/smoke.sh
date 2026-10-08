#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
load_contabo
validate_genesis_config >/dev/null
for service in app worker scheduler; do
  id="$(genesis_compose ps -q "$service")"
  [[ -n "$id" ]] || fail_contabo "$service ausente."
  [[ "$(docker inspect --format '{{.State.Status}}' "$id")" == running ]] || fail_contabo "$service parado."
  [[ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$id")" == healthy ]] || fail_contabo "$service sem health healthy."
  actual="$(docker inspect --format '{{.Image}}' "$id")"
  expected="$(docker image inspect "genesis-talk-$service:1.77.0" --format '{{.Id}}')"
  [[ "$actual" == "$expected" ]] || fail_contabo "$service executa imagem diferente da imagem local Genesis."
done
genesis_compose exec -T app node -e '
const net=require("net");const s=net.connect(3000,"127.0.0.1");s.setTimeout(5000);s.on("connect",()=>process.exit(0));s.on("error",()=>process.exit(1));s.on("timeout",()=>process.exit(1));
' || fail_contabo 'App TCP indisponível.'
genesis_compose exec -T app node -e '
(async()=>{const r=await fetch("http://127.0.0.1:3000/api/v1/health",{signal:AbortSignal.timeout(10000)});if(!r.ok)process.exit(1);const b=await r.json();if(JSON.stringify(b).indexOf("1.77.0")<0)process.exit(1)})().catch(()=>process.exit(1));
' || fail_contabo 'Health/readiness ou versão 1.77.0 reprovou; verifique dependências internas.'
tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT
curl --fail --silent --show-error --max-time 20 "https://$DOMAIN/login" -o "$tmp" || fail_contabo 'HTTPS/login indisponível (sem ignorar TLS).'
grep -Eiq '<form|type="password"' "$tmp" || fail_contabo 'Login não retornou o formulário esperado.'
curl --fail --silent --show-error --max-time 20 "https://$DOMAIN/api/v1/health" -o /dev/null || fail_contabo 'Health público reprovou.'
printf 'PASS: smoke sem autenticação. E2E autenticado é um gate separado.\n'
