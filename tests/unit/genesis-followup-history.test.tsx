import type { ComponentProps } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactFlow } from "@xyflow/react";
import type { FlowGraph, NodeType } from "@/lib/followup/graph-schema";
import type { FollowupFlowDetailRow } from "@/hooks/followup/useFollowupFlow";

const canvas = vi.hoisted(() => ({ props: undefined as unknown }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (text: string) => text }));
vi.mock("@/hooks/followup/useFollowupFlow", () => ({
  useFollowupFlow: (_id: string, options: { initialData: unknown }) => ({
    data: options.initialData,
  }),
}));
vi.mock("@xyflow/react", async (original) => {
  const actual = await original<typeof import("@xyflow/react")>();
  return {
    ...actual,
    ReactFlow: (props: unknown) => {
      canvas.props = props;
      return null;
    },
    useReactFlow: () => ({ fitView: vi.fn(), screenToFlowPosition: (p: unknown) => p }),
  };
});
vi.mock("@/app/app/ai/followups/[id]/_components/EtapasDoFluxo", () => ({
  EtapasDoFluxoProvider: ({ children }: { children: React.ReactNode }) => children,
  useEtapasDoFluxo: () => ({ nomes: new Map() }),
}));
vi.mock("@/app/app/ai/followups/[id]/_components/NodePalette", () => ({
  NodePalette: ({ onAdd }: { onAdd: (type: NodeType) => void }) => (
    <div>
      {(["wait", "move_lead", "edit_lead_tag"] as const).map((type) => (
        <button key={type} onClick={() => onAdd(type)}>
          add-{type}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("@/app/app/ai/followups/[id]/_components/NodeConfigPanel", () => ({
  NodeConfigPanel: ({
    onDelete,
    onSettingsChange,
  }: {
    onDelete: () => void;
    onSettingsChange: (s: FlowGraph["settings"]) => void;
  }) => (
    <div>
      <button onClick={onDelete}>delete-node</button>
      <button onClick={() => onSettingsChange({ max_tentativas_pergunta: 2 })}>settings</button>
    </div>
  ),
}));
vi.mock("@/app/app/ai/followups/[id]/_components/PublishBar", () => ({
  PublishBar: ({
    graph,
    dirty,
    onSaved,
  }: {
    graph: FlowGraph;
    dirty: boolean;
    onSaved: (g: FlowGraph) => void;
  }) => (
    <div>
      <output data-testid="graph">{JSON.stringify(graph)}</output>
      <output data-testid="dirty">{String(dirty)}</output>
      <button onClick={() => onSaved(graph)}>save-receipt</button>
    </div>
  ),
}));
// Explicit static import keeps production code as the system under test.
import { FlowCanvas } from "@/app/app/ai/followups/[id]/_components/FlowCanvas";

function graph(): FlowGraph {
  return JSON.parse(screen.getByTestId("graph").textContent!) as FlowGraph;
}
function rf() {
  return canvas.props as ComponentProps<typeof ReactFlow>;
}
function mount() {
  const draft: FlowGraph = {
    nodes: [
      { id: "trigger-1", type: "trigger", label: "Início", position: { x: 1, y: 2 }, config: {} },
      { id: "end-2", type: "end", label: "Fim", position: { x: 3, y: 4 }, config: { outcome: "converted" } },
    ],
    edges: [
      {
        id: "edge-1",
        source: "trigger-1",
        target: "end-2",
        priority: 0,
        condition: { type: "always" },
      },
    ],
    settings: { max_tentativas_pergunta: 4, gatilhos: ["iniciar"] },
  };
  const initialData = {
    id: "flow-a",
    draft_graph: draft,
    trigger_config: {},
    surface: "followup",
  } as FollowupFlowDetailRow;
  render(<FlowCanvas flowId="flow-a" initialData={initialData} />);
  return draft;
}
function selectEnd() {
  act(() =>
    rf().onNodeClick?.(
      {} as never,
      rf().nodes!.find((n) => n.id === "end-2")!,
    ),
  );
}
const undo = () => fireEvent.click(screen.getByTestId("genesis-followup-undo"));
beforeEach(() => {
  canvas.props = undefined;
});
describe("GEN-007..011: histórico no FlowCanvas atual", () => {
  it("desconecta sem apagar o nó e Undo repõe as arestas", () => {
    const original = mount();
    selectEnd();
    fireEvent.click(screen.getByTestId("genesis-followup-disconnect-node"));
    expect(graph().nodes).toHaveLength(2);
    expect(graph().edges).toHaveLength(0);
    undo();
    expect(graph()).toEqual(original);
  });
  it("Undo restaura settings e exclusão de nó com suas arestas", () => {
    const original = mount();
    selectEnd();
    fireEvent.click(screen.getByText("settings"));
    expect(graph().settings?.max_tentativas_pergunta).toBe(2);
    undo();
    expect(graph().settings).toEqual(original.settings);
    selectEnd();
    fireEvent.click(screen.getByText("delete-node"));
    expect(graph().nodes).toHaveLength(1);
    expect(graph().edges).toHaveLength(0);
    undo();
    expect(graph()).toEqual(original);
  });
  it("captura o início do drag antes de mover o nó", () => {
    const original = mount();
    act(() => rf().onNodeDragStart?.({} as never, rf().nodes![0]!, rf().nodes!));
    act(() =>
      rf().onNodesChange?.([{ id: "trigger-1", type: "position", position: { x: 300, y: 400 } }]),
    );
    expect(graph().nodes[0]?.position).toEqual({ x: 300, y: 400 });
    undo();
    expect(graph()).toEqual(original);
  });
  it("retém só as 100 últimas ações sem apagar settings", () => {
    mount();
    for (let i = 0; i < 101; i++) fireEvent.click(screen.getByText("add-wait"));
    expect(graph().nodes).toHaveLength(103);
    for (let i = 0; i < 100; i++) undo();
    expect(graph().nodes).toHaveLength(3);
    expect(graph().settings?.gatilhos).toEqual(["iniciar"]);
    expect(screen.getByTestId("genesis-followup-undo")).toBeDisabled();
  });
  it("preserva tipos novos e o grafo entregue ao recibo de salvar", () => {
    mount();
    fireEvent.click(screen.getByText("add-move_lead"));
    fireEvent.click(screen.getByText("add-edit_lead_tag"));
    expect(graph().nodes.map((n) => n.type)).toContain("move_lead");
    expect(graph().nodes.map((n) => n.type)).toContain("edit_lead_tag");
    expect(screen.getByTestId("dirty")).toHaveTextContent("true");
    fireEvent.click(screen.getByText("save-receipt"));
    expect(screen.getByTestId("dirty")).toHaveTextContent("false");
    undo();
    expect(graph().nodes.map((n) => n.type)).not.toContain("edit_lead_tag");
    expect(graph().nodes.map((n) => n.type)).toContain("move_lead");
  });
});
