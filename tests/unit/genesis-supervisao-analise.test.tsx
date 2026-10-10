import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  query: {
    data: undefined as unknown,
    isError: false,
    isPending: true,
    isFetching: false,
    refetch: vi.fn(),
  },
  calls: [] as unknown[],
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (args: unknown) => {
    state.calls.push(args);
    return state.query;
  },
}));
import { SupervisaoAnalise } from "@/app/app/supervisao/_components/SupervisaoAnalise";
import { supervisionQuery } from "@/lib/metrics/supervisao";
const options = { agents: [], channels: [], pipelines: [] };
const payload = {
  definition: 1,
  observed_at: "2026-10-10T12:00:00Z",
  totals: { queue: 2, calls: 1205 },
  cost_cents: null,
  unpriced_calls: 5,
  tokens: 10,
  handoff_conversations: 0,
  active_period_conversations: 0,
  attendants: [],
  agents: [],
  reasons: [],
  rows: [
    {
      id: "row",
      conversation_id: "conversation-id",
      lead_id: null,
      reason: "Aguardando",
      at: null,
    },
  ],
};
beforeEach(() => {
  state.calls = [];
  state.query.data = undefined;
  state.query.isError = false;
  state.query.isPending = true;
  state.query.refetch.mockClear();
});
describe("Supervisão: filtros, ausência e população", () => {
  it("não transforma carregamento em zero ou SLA inventado", () => {
    render(<SupervisaoAnalise orgId="a" options={options} attendants={[]} />);
    expect(screen.getByText("Carregando análise")).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: /Fila no escopo/ })).getByText("—"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Defina a régua")).toHaveLength(2);
  });
  it("falha oculta valores anteriores e oferece nova tentativa", () => {
    state.query.data = payload;
    state.query.isError = true;
    state.query.isPending = false;
    render(<SupervisaoAnalise orgId="a" options={options} attendants={[]} />);
    expect(screen.getByText(/Nenhum zero foi inferido/)).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: /Fila no escopo/ })).getByText("—"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(state.query.refetch).toHaveBeenCalledOnce();
  });
  it("liga o indicador à conversa e mantém preço desconhecido explícito", () => {
    state.query.data = payload;
    state.query.isPending = false;
    render(<SupervisaoAnalise orgId="a" options={options} attendants={[]} />);
    expect(screen.getByRole("link", { name: "Abrir conversa" })).toHaveAttribute(
      "href",
      "/app/inbox?id=conversation-id",
    );
    expect(screen.getByText(/5 chamadas sem preço/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Chamadas de IA/ }));
    const args = state.calls.at(-1) as { queryKey: string[] };
    expect(args.queryKey[2]).toContain("kind=calls");
    expect(args.queryKey[2]).toContain("offset=0");
  });
  it("rejeita org fornecida pelo navegador, janela excessiva e réguas inválidas", () => {
    const base = { from: "2026-10-01T00:00:00Z", to: "2026-10-02T00:00:00Z" };
    expect(supervisionQuery.safeParse(base).success).toBe(true);
    for (const extra of [
      { organization_id: "b" },
      { wait_minutes: 0 },
      { cold_days: -1 },
      { to: "2027-10-01T00:00:00Z" },
    ])
      expect(supervisionQuery.safeParse({ ...base, ...extra }).success).toBe(false);
  });
});
