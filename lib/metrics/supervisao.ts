import { z } from "zod";

export const supervisionKinds = [
  "queue",
  "ai",
  "human",
  "waiting",
  "cold",
  "followup",
  "failures",
  "handoff",
  "calls",
  "won",
  "lost",
  "response",
  "handoff_pending",
  "channel_down",
  "observed",
] as const;
export const supervisionQuery = z
  .object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
    owner: z.string().uuid().optional(),
    agent: z.string().uuid().optional(),
    channel: z.string().uuid().optional(),
    pipeline: z.string().uuid().optional(),
    wait_minutes: z.coerce.number().int().min(1).max(10080).optional(),
    cold_days: z.coerce.number().int().min(1).max(365).optional(),
    kind: z.enum(supervisionKinds).default("queue"),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict()
  .refine(
    (q) => {
      const duration = Date.parse(q.to) - Date.parse(q.from);
      return duration > 0 && duration <= 90 * 86400000;
    },
    { message: "Escolha um período de até 90 dias." },
  );
export type SupervisionKind = (typeof supervisionKinds)[number];
export interface SupervisionData {
  definition: number;
  observed_at: string;
  from: string;
  to: string;
  wait_minutes: number | null;
  cold_days: number | null;
  totals: Partial<Record<SupervisionKind, number>>;
  cost_cents: number | null;
  unpriced_calls: number;
  tokens: number;
  handoff_conversations: number;
  active_period_conversations: number;
  unattributed_handoffs: number;
  first_response_seconds: number | null;
  attendants: {
    owner_id: string;
    active: number;
    waiting: number;
    won: number;
    lost: number;
    first_response_seconds: number | null;
  }[];
  agents: {
    agent_id: string;
    calls: number;
    cost_cents: number | null;
    failures: number;
    handoffs: number;
  }[];
  reasons: { reason: string; total: number }[];
  kind: SupervisionKind;
  offset: number;
  rows: {
    id: string;
    conversation_id: string | null;
    lead_id: string | null;
    at: string | null;
    reason: string;
    cost_cents: number | null;
    tokens: number | null;
    duration_seconds: number | null;
    handoff_state: "pending" | "returned_to_ai" | "assumed" | null;
    time_to_assume_seconds: number | null;
  }[];
}
