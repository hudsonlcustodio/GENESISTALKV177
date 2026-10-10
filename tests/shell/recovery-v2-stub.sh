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
