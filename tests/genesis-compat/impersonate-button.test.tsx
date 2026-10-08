import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ImpersonateButton } from "@/components/admin/ImpersonateButton";

const mocks = vi.hoisted(() => ({ notify: vi.fn(), push: vi.fn(), error: vi.fn(), begin: vi.fn(), cancel: vi.fn() }));
vi.mock("@/components/shell/OrganizationTransitionProvider", () => ({
  useOrganizationTransition: () => ({ begin: mocks.begin, cancel: mocks.cancel }),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (text: string) => text }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/components/app/ImpersonateBanner", () => ({ notifySupportTransition: mocks.notify }));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it.each([false, true])("envia a escolha de somente leitura: %s", async (readonly) => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
  vi.stubGlobal("fetch", fetchMock);
  render(<ImpersonateButton organizationId="org-test" displayName="Empresa teste" />);
  fireEvent.click(screen.getByRole("button", { name: "Acompanhar Empresa teste" }));
  if (readonly) fireEvent.click(screen.getByLabelText("Somente leitura"));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar e entrar" }));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/tenants/org-test/impersonate",
      expect.objectContaining({
        body: JSON.stringify({ access_mode: readonly ? "support_readonly" : "full" }),
      }),
    ),
  );
  expect(mocks.notify).not.toHaveBeenCalled();
  expect(mocks.cancel).toHaveBeenCalledOnce();
});

it("avisa as outras abas somente depois do suporte ser confirmado", async () => {
  const assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ data: { redirect_url: "/app/inbox" } }),
      }),
  );
  render(<ImpersonateButton organizationId="org-test" displayName="Empresa teste" />);
  fireEvent.click(screen.getByRole("button", { name: "Acompanhar Empresa teste" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar e entrar" }));
  await waitFor(() => expect(mocks.notify).toHaveBeenCalledOnce());
  expect(mocks.begin).toHaveBeenCalledWith("Carregando acompanhamento…");
  expect(mocks.cancel).not.toHaveBeenCalled();
  expect(assign).toHaveBeenCalledWith("/app/inbox");
  // Uma navegação RSC simultânea reabre o cache do contexto anterior.
  expect(mocks.push).not.toHaveBeenCalled();
});
