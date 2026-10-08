import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useMarkAsRead } from "@/hooks/inbox/useMarkAsRead";

const mocks = vi.hoisted(() => ({ allowed: true, mutate: vi.fn() }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  usePermission: () => mocks.allowed,
  useAuth: () => ({ user: { support: null } }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}), useMutation: () => ({ mutate: mocks.mutate }) }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

it("somente leitura não dispara marcação automática", () => {
  vi.useFakeTimers(); mocks.allowed = false;
  renderHook(() => useMarkAsRead("conversa", 2));
  act(() => vi.advanceTimersByTime(2000));
  expect(mocks.mutate).not.toHaveBeenCalled();
});

it("mantém a marcação para quem pode operar a conversa", () => {
  vi.useFakeTimers(); mocks.allowed = true;
  renderHook(() => useMarkAsRead("conversa", 2));
  act(() => vi.advanceTimersByTime(1500));
  expect(mocks.mutate).toHaveBeenCalledWith("conversa");
});

it("cancela marcação pendente quando perde permissão", () => {
  vi.useFakeTimers(); mocks.allowed = true;
  const hook = renderHook(() => useMarkAsRead("conversa", 2));
  act(() => vi.advanceTimersByTime(1000));
  mocks.allowed = false; hook.rerender();
  act(() => vi.advanceTimersByTime(1000));
  expect(mocks.mutate).not.toHaveBeenCalled();
});
