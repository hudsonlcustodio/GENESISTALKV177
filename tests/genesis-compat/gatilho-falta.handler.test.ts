import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc }),
}));

import { followupGatilhoPresencaHandler } from "@/lib/followup/gatilho-presenca.handler";

const event = {
  id: "00000000-0000-4000-8000-000000000001",
  organization_id: "00000000-0000-4000-8000-000000000002",
  event_type: "appointment.outcome_confirmed",
  entity_kind: "calendar_appointment",
  entity_id: "00000000-0000-4000-8000-000000000003",
  payload: {},
  metadata: {},
  consumed_by: [],
  attempts: 0,
};

describe("gatilho de recuperação após falta", () => {
  beforeEach(() => rpc.mockReset());

  it("entrega o evento à função idempotente do banco", async () => {
    rpc.mockResolvedValue({ data: { result: "started" }, error: null });
    await expect(followupGatilhoPresencaHandler.handle(event)).resolves.toEqual({
      consumer_key: followupGatilhoPresencaHandler.key,
      status: "ok",
      detail: "started",
    });
    expect(rpc).toHaveBeenCalledWith("fn_appointment_recover", {
      p_org: event.organization_id,
      p_event: event.id,
    });
  });

  it("mantém a linha retentável quando o banco falha", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    await expect(followupGatilhoPresencaHandler.handle(event)).resolves.toMatchObject({
      consumer_key: followupGatilhoPresencaHandler.key,
      status: "error",
      detail: "Recuperação indisponível: database unavailable",
    });
  });
});
