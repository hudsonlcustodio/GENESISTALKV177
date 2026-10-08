import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";

const mock = vi.hoisted(() => ({
  realtime: { setAuth: vi.fn(), accessTokenValue: "jwt-teste" },
  channel: vi.fn(),
  removeChannel: vi.fn(),
}));
vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => mock,
}));

it("não assina até a callback canônica terminar de autenticar", async () => {
  let resolve!: () => void;
  mock.realtime.setAuth.mockReturnValue(
    new Promise<void>((done) => {
      resolve = done;
    }),
  );
  const channel = { subscribe: vi.fn(), on: vi.fn() };
  channel.on.mockReturnValue(channel);
  mock.channel.mockReturnValue(channel);
  const { unmount } = renderHook(() => useRealtimeChannel({ name: "teste", onChange: vi.fn() }));
  const second = renderHook(() => useRealtimeChannel({ name: "segundo", onChange: vi.fn() }));
  expect(mock.realtime.setAuth).toHaveBeenCalledOnce();
  expect(channel.subscribe).not.toHaveBeenCalled();
  await act(async () => resolve());
  expect(channel.subscribe).toHaveBeenCalledTimes(2);
  unmount();
  second.unmount();
});
