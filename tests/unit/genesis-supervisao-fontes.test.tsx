import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queries = vi.hoisted(() => ({
  counts: { data: undefined as unknown, isError: false, isPending: true, dataUpdatedAt: 0 },
  team: { data: undefined as unknown, isError: false, isPending: true, dataUpdatedAt: 0 },
  performance: { data: undefined as unknown, isError: false, isPending: true, dataUpdatedAt: 0 },
  operator: { data: undefined as unknown, isError: false, isPending: true, dataUpdatedAt: 0 },
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (text: string) => text }));
vi.mock("@/hooks/inbox/useConversationCounts", () => ({
  useConversationCounts: () => queries.counts,
}));
vi.mock("@/hooks/team/useAttendants", () => ({ useAttendants: () => queries.team }));
vi.mock("@/hooks/metrics/useAttendantMetrics", () => ({
  useAttendantMetrics: () => queries.performance,
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => queries.operator }));
// This suite covers the existing overview; the filtered population has its own suite.
vi.mock("@/app/app/supervisao/_components/SupervisaoAnalise", () => ({
  SupervisaoAnalise: () => null,
}));

import { Supervisao360Client } from "@/app/app/supervisao/_components/Supervisao360Client";

function metric(title: string) {
  return within(screen.getByText(title).parentElement!).getByText(/^(—|\d+)$/);
}
beforeEach(() => {
  for (const query of Object.values(queries)) {
    query.data = undefined;
    query.isError = false;
    query.isPending = true;
    query.dataUpdatedAt = 0;
  }
});
describe("Supervisão 360: ausência de fonte não afirma zero", () => {
  it("mostra ausência enquanto a equipe carrega", () => {
    render(<Supervisao360Client orgId="org-a" />);
    expect(metric("Pessoas presentes")).toHaveTextContent("—");
    expect(metric("Carga atribuída")).toHaveTextContent("—");
    expect(screen.getAllByRole("status").every((s) => s.textContent?.includes("Carregando"))).toBe(
      true,
    );
  });
  it("não usa dados anteriores quando uma atualização falhou", () => {
    queries.team.data = { data: [{ present: true, is_available: true, current_load: 7 }] };
    queries.team.isError = true;
    queries.team.isPending = false;
    queries.counts.data = { fila: 23 };
    queries.counts.isError = true;
    render(<Supervisao360Client orgId="org-a" />);
    expect(metric("Pessoas presentes")).toHaveTextContent("—");
    expect(metric("Carga atribuída")).toHaveTextContent("—");
    expect(metric("Fila humana")).toHaveTextContent("—");
    expect(screen.getAllByText(/Fonte indisponível/)).toHaveLength(2);
  });
  it("zero é válido para uma resposta vazia bem-sucedida e tem timestamp", () => {
    queries.team.data = { data: [] };
    queries.team.isPending = false;
    queries.team.dataUpdatedAt = Date.parse("2026-10-08T12:00:00Z");
    render(<Supervisao360Client orgId="org-a" />);
    expect(metric("Pessoas presentes")).toHaveTextContent("0");
    expect(metric("Carga atribuída")).toHaveTextContent("0");
    expect(screen.getByText(/Última atualização/).querySelector("time")).toHaveAttribute(
      "datetime",
      "2026-10-08T12:00:00.000Z",
    );
  });
  it("a falha do roster não apaga uma fonte de conversas saudável", () => {
    queries.counts.data = { fila: 3, automatico: 8, mine: 1, all: 12 };
    queries.operator.data = { turnos: 9, promessas: { semDono: 2 } };
    queries.team.isError = true;
    render(<Supervisao360Client orgId="org-a" />);
    expect(metric("Fila humana")).toHaveTextContent("3");
    expect(metric("Pessoas presentes")).toHaveTextContent("—");
  });
});
