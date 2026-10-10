#!/usr/bin/env bash
# Explicit host installation of backups and monitor; never invoked on this PC.
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
load_contabo
[[ "$(uname -s)" == Linux ]] || fail_contabo 'Agendamento exige o host Linux da instalação.'
command -v crontab >/dev/null || fail_contabo 'Instale cron antes de agendar.'
[[ "$GENESIS_ROOT" != *"'"* && "$GENESIS_ROOT" != *$'\n'* && "$GENESIS_ROOT" != *'%'* ]] \
  || fail_contabo 'Caminho incompatível com crontab.'
umask 077
mkdir -p .runtime/contabo
existing="$(crontab -l 2>/dev/null || true)"
installation="$(printf '%s' "$GENESIS_ROOT" | sha256sum | cut -c1-16)"
file="$(mktemp)"; trap 'rm -f "$file"' EXIT
printf '%s\n' "$existing" | sed "/# BEGIN GENESIS OPERATIONS $installation/,/# END GENESIS OPERATIONS $installation/d" > "$file"
cat >> "$file" <<EOF
# BEGIN GENESIS OPERATIONS $installation
17 2 * * * cd '$GENESIS_ROOT' && bash hostgator-setup-kit/backup.sh >> .runtime/contabo/backup-cron.log 2>&1
* * * * * cd '$GENESIS_ROOT' && bash deploy/contabo/monitor.sh >> .runtime/contabo/monitor-cron.log 2>&1
# END GENESIS OPERATIONS $installation
EOF
crontab "$file"
printf 'PASS: backup diário 02:17 (fuso do host), monitor a cada minuto; logs protegidos em .runtime/contabo.\n'
