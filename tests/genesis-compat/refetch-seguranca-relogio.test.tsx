import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useRefetchDeSeguranca } from "@/hooks/realtime/useRefetchDeSeguranca";

afterEach(() => vi.useRealTimers());

it("não adia a verificação quando renders recriam a mesma queryKey", async () => {
  vi.useFakeTimers();
  const client = new QueryClient();
  const refetch = vi.spyOn(client, "refetchQueries").mockResolvedValue();
  const ultimaEntrega = { current: null };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { rerender, unmount } = renderHook(() => useRefetchDeSeguranca({
    queryKey: ["board", "pipeline"],
    assinatura: () => "estado",
    ultimaEntrega,
    intervaloMs: 1000,
  }), { wrapper });
  for (let i = 0; i < 5; i++) {
    await act(() => vi.advanceTimersByTimeAsync(200));
    rerender();
  }
  expect(refetch).toHaveBeenCalledTimes(1);
  unmount();
  client.clear();
});
