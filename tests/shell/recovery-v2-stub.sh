# Shared fixture for Docker doubles. Real transactions/ACLs are exercised by
# scripts/genesis-recovery-rehearsal.mjs, not inferred from these CLI doubles.
recovery_v2_stub() {
  case " $* " in
    *" pg_dump "*) printf 'DROP TABLE IF EXISTS public.fixture;\nCREATE TABLE public.fixture(id int);\nCOPY public.fixture (id) FROM stdin;\n1\n\\.\n'; return 0 ;;
    *" psql "*"server_version_num"*) printf '17\n'; return 0 ;;
    *" psql "*"count(*) from public.channel_sessions"*) printf '%s\n' "${RECOVERY_SESSIONS:-0}"; return 0 ;;
    *" psql "*"pg_tables"*) printf '%s\n' "${RECOVERY_TARGET_COUNT:-0}"; return 0 ;;
    *" psql "*)
      case " $* " in *" -c "*|*" -f "*) return 1 ;; esac
      local input; input="$(cat)"
      case "$input" in *"schema_fingerprint"*"with settings"*) ;; esac
      case "$input" in *"Stable public-schema contract"*)
        printf '{"format":2,"postgres_major":17,"schema_fingerprint":"00000000000000000000000000000000"}\n' ;;
      esac
      return 0 ;;
  esac
  return 1
}

make_recovery_fixture() {
  local dump="$1" kit="$2"
  printf 'DROP TABLE IF EXISTS public.fixture;\nCREATE TABLE public.fixture(id int);\nCOPY public.fixture (id) FROM stdin;\n1\n\\.\n' | gzip > "$dump"
  printf '{"format":2,"postgres_major":17,"schema_fingerprint":"00000000000000000000000000000000"}\n' > "${dump%.sql.gz}.catalog.json"
  python3 "$kit/recovery.py" create "$dump" --storage-required "${3:-0}"
}

# Upgrade a copied kit's successful-backup double without changing the scenario's
# install/update/health behavior. Never use in tests of backup failure itself.
install_recovery_backup_double() {
  local kit="$1" bin="$2"
  cp "$(dirname "${BASH_SOURCE[0]}")/recovery-v2-stub.sh" "$bin/recovery-v2-stub.sh"
  sed -i '2i export RECOVERY_STUB_MODE=1' "$kit/backup.sh"
  if [ ! -f "$bin/docker-scenario" ]; then
    mv "$bin/docker" "$bin/docker-scenario"
    cat > "$bin/docker" <<'RECOVERY_DOCKER'
#!/usr/bin/env bash
if [[ "${RECOVERY_STUB_MODE:-0}" == 1 ]]; then
  case " $* " in
    *" pg_dump "*|*" psql "*" -X -qAt "*)
      printf '%s\n' "$*" >> "$DOCKER_LOG"
      source "$(dirname "$0")/recovery-v2-stub.sh"
      recovery_v2_stub "$@"
      exit $? ;;
    *" run "*" tar czf - "*)
      printf '%s\n' "$*" >> "$DOCKER_LOG"
      tar czf - --files-from /dev/null
      exit $? ;;
  esac
fi
exec "$(dirname "$0")/docker-scenario" "$@"
RECOVERY_DOCKER
    chmod +x "$bin/docker"
  fi
}
