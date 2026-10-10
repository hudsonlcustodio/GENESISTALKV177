#!/usr/bin/env bash
# Full recovery only into an empty, compatible, dedicated destination.
source "$(dirname "$0")/_common.sh"
RECOVERY_KIT="$(cd "$(dirname "$0")" && pwd)"
enter_project
command -v python3 >/dev/null || die 'Restore exige Python 3.'
command -v flock >/dev/null || die 'Restore exige flock.'
umask 077
mkdir -p "$PROJECT_DIR/.runtime"
exec 7>"$PROJECT_DIR/.runtime/recovery.lock"
flock -n 7 || die 'Já existe backup/restore em andamento.'
DUMP="${1:-}"
[[ -f "$DUMP" ]] || die 'Uso: restore.sh <db-<instante>.sql.gz>'
major="$(python3 "$RECOVERY_KIT/recovery.py" verify "$DUMP" --storage-required "${SINGLE_SERVER:-0}")" \
  || die 'Bundle inválido/legado: nada foi alterado.'
image="postgres:$major-alpine"
target_major="$(pg_container "$image" psql "$(url_do_schema)" -X -qAt -v ON_ERROR_STOP=1 \
  -c "select current_setting('server_version_num')::int / 10000;")" \
  || die 'Não consegui verificar o destino.'
python3 "$RECOVERY_KIT/recovery.py" verify "$DUMP" --major "$target_major" >/dev/null \
  || die 'Destino incompatível: nada foi alterado.'
# Initialized Supabase internal schemas are allowed only without users/objects.
empty="$(pg_container "$image" psql "$(url_do_schema)" -X -qAt -v ON_ERROR_STOP=1 -c "
  select (select count(*) from pg_tables where schemaname='public')
       + case when to_regclass('auth.users') is null then 0 else
         (xpath('/row/n/text()', query_to_xml('select count(*) n from auth.users',false,true,'')))[1]::text::bigint end
       + case when to_regclass('storage.objects') is null then 0 else
         (xpath('/row/n/text()', query_to_xml('select count(*) n from storage.objects',false,true,'')))[1]::text::bigint end;")" \
  || die 'Não consegui conferir se o banco está vazio: nada foi alterado.'
[[ "$empty" == 0 ]] || die 'Destino já tem tabelas do sistema, usuários ou anexos: nada foi alterado. Use um destino isolado vazio.'
running="$(dc ps --status running -q app worker scheduler voice-agent waha)" \
  || die 'Não consegui conferir os serviços do destino.'
[[ -z "$running" ]] || die 'Pare app, worker, scheduler, voice-agent e canal antes do restore.'
bundle_dir="$(cd "$(dirname "$DUMP")" && pwd)"
bundle_id="$(basename "$DUMP" .sql.gz)"; bundle_id="${bundle_id#db-}"
WAHA_TAR="$bundle_dir/waha-$bundle_id.tgz"
STORAGE_TAR="$bundle_dir/storage-$bundle_id.tgz"
empty_volume() {
  docker run --rm -v "$1:/data:ro" alpine:3.20 sh -c \
    'test -z "$(find /data -mindepth 1 -maxdepth 1 -print -quit)"' \
    || die 'Volume de destino ocupado ou ilegível: nada foi restaurado. Use volumes vazios dedicados.'
}
if [[ -f "$WAHA_TAR" ]]; then empty_volume "$(volume_waha_data)"; fi
if [[ "${SINGLE_SERVER:-0}" == 1 ]]; then empty_volume "$(dir_do_supabase)/volumes/storage"; fi
c_ylw 'O restore recria os objetos do backup em um destino vazio COMPATÍVEL. Não use banco compartilhado.'
read -r -p "Digite 'RESTAURAR' para confirmar: " answer
[[ "$answer" == RESTAURAR ]] || die 'Cancelado.'
checks="${DUMP%.sql.gz}.checks.sql"
started="$(date +%s)"
# SQL, COPY-count and ACL/schema errors all roll back. An auth/storage/extension
# mismatch means incompatible destination, never permission for partial success.
if ! { gunzip -c "$DUMP" && cat "$checks"; } | pg_container -i "$image" \
  psql "$(url_do_schema)" -X -v ON_ERROR_STOP=1 --single-transaction; then
  die 'Restauração reprovou e a transação foi revertida. Confira versão/roles/extensões do destino.'
fi
c_grn '✓ banco restaurado: contagens, schema, RLS e privilégios conferidos.'

if [[ -f "$WAHA_TAR" ]]; then
  vol="$(volume_waha_data)"
  docker run --rm -v "${vol}:/data" -v "$(cd "$(dirname "$WAHA_TAR")" && pwd):/in:ro" alpine:3.20 \
    sh -c 'test -z "$(find /data -mindepth 1 -maxdepth 1 -print -quit)" && tar xzf "/in/$1" -C /data' _ "$(basename "$WAHA_TAR")" \
    || die 'Banco recuperado; sessão do canal falhou. Repare o volume antes de subir o app (não repita o restore do banco).'
fi
if [[ "${SINGLE_SERVER:-0}" == 1 ]]; then
  [[ -f "$STORAGE_TAR" ]] || die 'Banco recuperado, mas faltam anexos: não inicie o app.'
  docker run --rm -v "$(dir_do_supabase)/volumes/storage:/data" \
    -v "$(cd "$(dirname "$STORAGE_TAR")" && pwd):/in:ro" alpine:3.20 \
    sh -c 'test -z "$(find /data -mindepth 1 -maxdepth 1 -print -quit)" && tar xzf "/in/$1" -C /data' _ "$(basename "$STORAGE_TAR")" \
    || die 'Banco recuperado; anexos falharam. Repare o volume antes de subir o app (não repita o restore do banco).'
fi
printf 'PASS: recuperação local em %s segundos. Valide login, objetos externos e canal antes de publicar.\n' "$(( $(date +%s) - started ))"
