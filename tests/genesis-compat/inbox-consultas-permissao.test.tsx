import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useAgentInbox } from "@/hooks/ai/useAgentInbox";
import { useAutomaticoAtivo } from "@/hooks/ai/useAutomaticoAtivo";
import { useConversationNotes } from "@/hooks/inbox/useConversationNotes";
import { useMessageTemplates } from "@/hooks/inbox/useMessageTemplates";

const mock = vi.hoisted(() => ({ allowed: false, get: vi.fn(), channel: vi.fn() }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ usePermission: () => mock.allowed }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: mock.get } }));
vi.mock("@/hooks/realtime/useRealtimeChannel", () => ({ useRealtimeChannel: mock.channel }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it.each([false, true])("consultas internas respeitam a permissão: %s", async (allowed) => {
  mock.allowed = allowed;
  mock.get.mockResolvedValue({ data: [] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  renderHook(() => {
    useAgentInbox(); useAutomaticoAtivo(); useConversationNotes("conversa"); useMessageTemplates();
  }, { wrapper });
  if (allowed) await waitFor(() => expect(mock.get).toHaveBeenCalledTimes(4));
  else expect(mock.get).not.toHaveBeenCalled();
  expect(mock.channel).toHaveBeenCalledWith(expect.objectContaining({ enabled: allowed }));
  client.clear();
});
