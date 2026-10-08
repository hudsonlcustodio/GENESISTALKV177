/**
 * GENESIS TALK — Security / support / realtime characterization contract.
 * Presence of code is not runtime proof. These invariants are release requirements.
 */
export const GENESIS_SECURITY_REALTIME_INVARIANTS = [
  "GEN-013: recheck automation/human blocks immediately before provider side effect",
  "GEN-014: Meet/send retry cannot duplicate external side effects",
  "GEN-015: realtime subscription starts only after authenticated context is ready",
  "GEN-016: safety refetch deadline is stable across React renders",
  "GEN-017: read-only support cannot mutate unread/read state",
  "GEN-018: read-only support cannot execute reserved write/admin operations",
  "GEN-019: support-context changes propagate safely across tabs",
  "GEN-020: tenant-owned data has server-side RLS/isolation coverage",
  "GEN-021: LGPD anonymization covers all material personal-data surfaces",
  "GEN-022: AI response drafts are included in anonymization/deletion lifecycle",
  "GEN-023: CRM tasks are included in anonymization/deletion lifecycle",
] as const;
