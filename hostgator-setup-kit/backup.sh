#!/usr/bin/env bash
# Recovery v2: data, ownership, ACLs, row counts and hashes belong to one bundle.
source "$(dirname "$0")/_common.sh"
RECOVERY_KIT="$(cd "$(dirname "$0")" && pwd)"
enter_project
command -v python3 >/dev/null || die 'Backup exige Python 3 (biblioteca padrão).'
umask 077
command -v flock >/dev/null || die 'Backup exige flock.'
mkdir -p "$PROJECT_DIR/.runtime"
exec 7>"$PROJECT_DIR/.runtime/recovery.lock"
flock -n 7 || die 'Já existe backup/restore em andamento.'
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR" || die 'Não consegui proteger a pasta de backup.'
ts="$(date +%Y%m%d-%H%M%S)-$$"
dump="$BACKUP_DIR/db-$ts.sql.gz"
catalog="$BACKUP_DIR/db-$ts.catalog.json"

step 'Verificando versão e contrato de segurança do banco'
pg_container -i postgres:17-alpine psql "$(url_do_schema)" -X -qAt -v ON_ERROR_STOP=1 \
  < "$RECOVERY_KIT/recovery-catalog.sql" > "$catalog" \
  || die 'Não consegui medir schema/RLS/permissões; backup recusado.'
major="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["postgres_major"])' "$catalog")"
case "$major" in 15|17) ;; *) die 'Major PostgreSQL sem homologação de recuperação (15/17).';; esac
sessions="$(pg_container "postgres:$major-alpine" psql "$(url_do_schema)" -X -qAt -v ON_ERROR_STOP=1 \
  -c "select count(*) from public.channel_sessions where waha_session_name is not null;")" \
  || die 'Não consegui verificar as sessões cadastradas.'
case "$sessions" in ''|*[!0-9]*) die 'Contagem de sessões inválida.';; esac
required_sessions=0
[[ "$sessions" -eq 0 ]] || required_sessions=1

step "Dump completo → $dump"
# Keep owners AND privileges. --clean is used only by the guarded, transactional
# restore into a dedicated empty destination; legacy bundles are never trusted.
partial="$BACKUP_DIR/.db-$ts.sql.gz.parcial"
if ! pg_container "postgres:$major-alpine" pg_dump "$(url_do_schema)" \
    --clean --if-exists | gzip > "$partial"; then
  rm -f "$partial"
  die 'Dump falhou no meio: arquivo parcial removido.'
fi
gzip -t "$partial" || { rm -f "$partial"; die 'Dump saiu corrompido.'; }
mv "$partial" "$dump"
c_grn "✓ banco: $(du -h "$dump" | awk '{print $1}') (conferido)"

# Schema cannot change while bundling. Row counts are derived from the dump,
# so live inserts do not invalidate its MVCC data snapshot.
after="$BACKUP_DIR/.catalog-$ts.parcial"
pg_container -i "postgres:$major-alpine" psql "$(url_do_schema)" -X -qAt -v ON_ERROR_STOP=1 \
  < "$RECOVERY_KIT/recovery-catalog.sql" > "$after" || die 'Contrato final indisponível.'
cmp -s "$catalog" "$after" || die 'Schema/permissões mudaram durante o backup; repita.'
rm -f "$after"

step 'Snapshot das sessões do canal'
vol="$(volume_waha_data)"
partial="$BACKUP_DIR/.waha-$ts.tgz.parcial"
if ! docker run --rm -v "${vol}:/data:ro" alpine:3.20 tar czf - -C /data . > "$partial"; then
  rm -f "$partial"
  [[ "$required_sessions" == 0 ]] || die 'Canal cadastrado sem snapshot: atualização bloqueada.'
  c_ylw 'Sem sessão cadastrada; snapshot de canal omitido.'
elif ! tar_tem_sessao "$partial"; then
  rm -f "$partial"
  [[ "$required_sessions" == 0 ]] || die 'Snapshot saiu VAZIO para canal cadastrado; atualização bloqueada.'
  c_ylw 'Snapshot saiu VAZIO; não há pareamento cadastrado a preservar.'
else
  mv "$partial" "$BACKUP_DIR/waha-$ts.tgz"
fi

storage_required=0
if [[ "${SINGLE_SERVER:-0}" == 1 ]]; then
  storage_required=1
  partial="$BACKUP_DIR/.storage-$ts.tgz.parcial"
  if ! docker run --rm -v "$(dir_do_supabase)/volumes/storage:/data:ro" alpine:3.20 \
    tar czf - -C /data . > "$partial"; then
    rm -f "$partial"
    die 'Snapshot dos anexos falhou.'
  fi
  tar tzf "$partial" >/dev/null || { rm -f "$partial"; die 'Snapshot dos anexos corrompido.'; }
  mv "$partial" "$BACKUP_DIR/storage-$ts.tgz"
else
  c_ylw 'Storage externo: recupere os objetos no provedor; este bundle cobre o banco.'
fi
python3 "$RECOVERY_KIT/recovery.py" create "$dump" --sessions-required "$required_sessions" \
  --storage-required "$storage_required" || die 'Bundle incompleto; não atualize.'
python3 "$RECOVERY_KIT/recovery.py" verify "$dump" >/dev/null || die 'Integridade do bundle reprovou.'
if [[ -n "${BACKUP_OFFSITE_DIR:-}" ]]; then
  python3 "$RECOVERY_KIT/recovery.py" replicate "$dump" --destination "$BACKUP_OFFSITE_DIR" >/dev/null \
    || die 'Cópia externa falhou; atualização bloqueada.'
fi
retention_dir="$BACKUP_DIR"
case "$(cd "$BACKUP_DIR" && pwd)/" in "$PROJECT_DIR/backups/"*) retention_dir="$PROJECT_DIR/backups";; esac
python3 "$RECOVERY_KIT/recovery.py" retain "$retention_dir" --keep "${BACKUP_KEEP:-14}" \
  || die 'Retenção falhou; confira os bundles antes de atualizar.'
c_grn "✓ backup v2 verificado em $BACKUP_DIR; copie o bundle completo para fora desta VPS."
