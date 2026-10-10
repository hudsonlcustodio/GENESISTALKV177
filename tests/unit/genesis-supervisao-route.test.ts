import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { orgTemAutomatico } from "@/lib/ai/agents/org-tem-automatico";
import { GET } from "@/app/api/v1/metrics/supervisao/route";
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/ai/agents/org-tem-automatico", () => ({ orgTemAutomatico: vi.fn() }));
const rpc = vi.fn();
const org = "22222222-2222-4222-8222-222222222222";
const base =
  "http://localhost/api/v1/metrics/supervisao?from=2026-10-01T00:00:00Z&to=2026-10-02T00:00:00Z";
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    org: { orgId: org, role: "manager", name: "Org" },
    user: { id: "manager" },
  } as Awaited<ReturnType<typeof requireRole>>);
  vi.mocked(createClient).mockResolvedValue({ rpc } as unknown as Awaited<
    ReturnType<typeof createClient>
  >);
  vi.mocked(orgTemAutomatico).mockResolvedValue(false);
  rpc.mockResolvedValue({ data: { totals: { calls: 1205 } }, error: null });
});
describe("Supervisão HTTP: organização confiável e ausência explícita", () => {
  it("exige gestor antes de consultar fontes", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 403 }),
    });
    expect((await GET(new Request(base))).status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
  });
  it("rejeita organização e parâmetros desconhecidos enviados pelo navegador", async () => {
    expect((await GET(new Request(base + "&organization_id=" + org))).status).toBe(422);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("envia escopo da sessão, filtros validados e estado automático canônico", async () => {
    const response = await GET(
      new Request(base + "&channel=" + org + "&wait_minutes=30&kind=calls&offset=50"),
    );
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "fn_genesis_supervisao",
      expect.objectContaining({
        p_org: org,
        p_channel: org,
        p_wait_minutes: 30,
        p_kind: "calls",
        p_offset: 50,
        p_automatico: false,
      }),
    );
    expect((await response.json()).data.totals.calls).toBe(1205);
  });
  it("falha de elegibilidade não vira ausência de automático", async () => {
    vi.mocked(orgTemAutomatico).mockResolvedValue(undefined);
    expect((await GET(new Request(base))).status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("não expõe SQL ou segredos quando o banco falha", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "password=secret SELECT private" } });
    const response = await GET(new Request(base));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toMatch(/secret|SELECT/);
  });
});
