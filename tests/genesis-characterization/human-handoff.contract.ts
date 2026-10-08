/**
 * GENESIS TALK — Human handoff characterization contract.
 *
 * These are product invariants carried from the Aurum/Imobi fork.
 * They are intentionally expressed as a contract before implementation changes.
 *
 * GEN-001 After a conversation is handed to a human, automated responders must be silent.
 * GEN-002 All message/job entry points must consult the same attendance ownership boundary.
 * GEN-003 force_human/human ownership cannot be bypassed by a legacy worker.
 * GEN-004 A customer message after handoff must not silently reactivate the bot.
 * GEN-005 Bot→human eligibility must be evaluated before transfer side effects.
 * GEN-006 Automated follow-up must not send while human ownership blocks automation.
 */
export const GENESIS_HUMAN_HANDOFF_INVARIANTS = [
  "GEN-001: bot silent while human owns conversation",
  "GEN-002: shared attendance boundary across entry points",
  "GEN-003: legacy worker cannot bypass force_human/human ownership",
  "GEN-004: customer reply does not silently reactivate automation",
  "GEN-005: eligibility checked before bot-to-human transfer",
  "GEN-006: follow-up blocked during human ownership",
] as const;
