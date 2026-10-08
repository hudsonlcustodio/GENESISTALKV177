import { beforeEach, expect, it, vi } from "vitest";
import OnboardingIndex from "@/app/onboarding/page";

const mocks = vi.hoisted(() => ({ requireAuth: vi.fn(), resolveActiveOrg: vi.fn(), loadOnboardingState: vi.fn() }));
vi.mock("@/lib/auth/server", () => mocks);
vi.mock("@/app/actions/onboarding/_shared", () => mocks);
vi.mock("@/lib/env", () => ({ env: { NUVEMSHOP_ENABLED: false } }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(path); } }));
beforeEach(() => vi.clearAllMocks());

it("suporte ativo não inicia o onboarding da organização acompanhada", async () => {
  mocks.requireAuth.mockResolvedValue({ support: { status: "active" } });
  mocks.resolveActiveOrg.mockResolvedValue({ orgId: "org-b" });
  await expect(OnboardingIndex()).rejects.toThrow("/app");
  expect(mocks.loadOnboardingState).not.toHaveBeenCalled();
});

it("não contorna o bloqueio do resolvedor para suporte encerrado", async () => {
  mocks.requireAuth.mockResolvedValue({ support: { status: "expired" } });
  mocks.resolveActiveOrg.mockRejectedValue(new Error("/support-ended"));
  await expect(OnboardingIndex()).rejects.toThrow("/support-ended");
  expect(mocks.loadOnboardingState).not.toHaveBeenCalled();
});
