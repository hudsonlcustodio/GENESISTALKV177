#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
load_contabo
recusar_projeto_de_outra_arvore || fail_contabo 'Outra instalação ocupa este projeto Docker.'
umask 077
mkdir -p .runtime/contabo
exec 8>.runtime/contabo/monitor.lock
flock -n 8 || exit 0
export GENESIS_MONITOR_ROOT="$GENESIS_ROOT"
export GENESIS_MONITOR_CONTAINERS="$(jq -n \
  --arg app "$(genesis_compose ps -q app)" --arg worker "$(genesis_compose ps -q worker)" \
  --arg scheduler "$(genesis_compose ps -q scheduler)" '{app:$app,worker:$worker,scheduler:$scheduler}')"
exec python3 "$CONTABO_DIR/monitor.py"
