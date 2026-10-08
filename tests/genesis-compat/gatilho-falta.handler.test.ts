import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc }),
}));

import {
  FOLLOWUP_GATILHO_FALTA_HANDLER_KEY,
  followupGatilhoFaltaHandler,
} from "./gatilho-falta.handler";

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
    await expect(followupGatilhoFaltaHandler.handle(event)).resolves.toEqual({
      consumer_key: FOLLOWUP_GATILHO_FALTA_HANDLER_KEY,
      status: "ok",
      detail: "result=started",
    });
    expect(rpc).toHaveBeenCalledWith("fn_appointment_recover", {
      p_org: event.organization_id,
      p_event: event.id,
    });
  });

  it("mantém a linha retentável quando o banco falha", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    await expect(followupGatilhoFaltaHandler.handle(event)).resolves.toMatchObject({
      consumer_key: FOLLOWUP_GATILHO_FALTA_HANDLER_KEY,
      status: "error",
      detail: "database unavailable",
    });
  });
});
