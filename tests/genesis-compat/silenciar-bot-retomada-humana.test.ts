import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn() } }));
import { logger } from "@/lib/logger";

import {
  PRAZO_DO_SILENCIO_MS,
  pausarIaPorAtendimentoManual,
} from "@/lib/escalacao/atendimento-manual";

const ORG_ID = "23fe2ca9-7316-45eb-8b09-d607cb9696eb";
const CONV_ID = "beaa6819-72f8-4a7c-80c0-75d2a033b564";

/**
 * Dublê mínimo do client Supabase admin — só o suficiente para o caminho
 * `.from("conversations").select(...).eq().eq().maybeSingle()` (leitura) e
 * `.from("conversations").update(...).eq().eq()` (escrita, thenable direto, sem
 * `.select()`/`.single()` — o código não lê a linha de volta).
 */
function fakeAdmin(opts: {
  existing?: string | null;
  selectError?: { message: string };
  updateError?: { message: string };
  onUpdate?: (patch: Record<string, unknown>) => void;
}): Parameters<typeof pausarIaPorAtendimentoManual>[0] {
  const selectChain = {
    eq: () => selectChain,
    maybeSingle: () =>
      Promise.resolve(
        opts.selectError
          ? { data: null, error: opts.selectError }
          : { data: { bot_silenced_until: opts.existing ?? null }, error: null },
      ),
  };
  const updateChain = {
    eq: () => updateChain,
    then: (resolve: (v: { error: { message: string } | null }) => unknown) =>
      Promise.resolve({ error: opts.updateError ?? null }).then(resolve),
  };
  return {
    from: () => ({
      select: () => selectChain,
      update: (patch: Record<string, unknown>) => {
        opts.onUpdate?.(patch);
        return updateChain;
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

/**
 * `pausarIaPorAtendimentoManual` — ver docstring em `lib/escalacao/atendimento-manual.ts`. Cobre a
 * lacuna medida em produção (tenant YADEA): um humano respondeu direto pelo
 * WhatsApp, o bot não foi silenciado, e na mensagem seguinte do lead voltou a
 * rodar sozinho, alucinando sobre algo que só o humano tinha tratado (PIX).
 */
describe("pausarIaPorAtendimentoManual", () => {
  it("sem silêncio prévio, grava bot_silenced_until = agora + PRAZO_DO_SILENCIO_MS", async () => {
    let patchGravado: Record<string, unknown> | null = null;
    const antes = Date.now();
    await pausarIaPorAtendimentoManual(
      fakeAdmin({ existing: null, onUpdate: (p) => (patchGravado = p) }),
      { organizationId: ORG_ID, conversationId: CONV_ID },
    );
    expect(patchGravado).not.toBeNull();
    const gravado = new Date((patchGravado as unknown as { bot_silenced_until: string }).bot_silenced_until).getTime();
    expect(gravado).toBeGreaterThanOrEqual(antes + PRAZO_DO_SILENCIO_MS - 1000);
    expect(gravado).toBeLessThanOrEqual(Date.now() + PRAZO_DO_SILENCIO_MS + 1000);
  });

  it("silêncio 'infinity' (handoff formal) NUNCA é encurtado", async () => {
    let chamouUpdate = false;
    await pausarIaPorAtendimentoManual(
      fakeAdmin({ existing: "infinity", onUpdate: () => (chamouUpdate = true) }),
      { organizationId: ORG_ID, conversationId: CONV_ID },
    );
    expect(chamouUpdate).toBe(false);
  });

  it("silêncio mais longo já em vigor (ex.: handoff manual de 6h) não é encurtado para a janela configurável (60 min por padrão)", async () => {
    let chamouUpdate = false;
    const daquiA6h = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    await pausarIaPorAtendimentoManual(
      fakeAdmin({ existing: daquiA6h, onUpdate: () => (chamouUpdate = true) }),
      { organizationId: ORG_ID, conversationId: CONV_ID },
    );
    expect(chamouUpdate).toBe(false);
  });

  it("silêncio mais curto já vencido (ou no passado) É estendido pra janela padrão", async () => {
    let chamouUpdate = false;
    const jaPassou = new Date(Date.now() - 60_000).toISOString();
    await pausarIaPorAtendimentoManual(
      fakeAdmin({ existing: jaPassou, onUpdate: () => (chamouUpdate = true) }),
      { organizationId: ORG_ID, conversationId: CONV_ID },
    );
    expect(chamouUpdate).toBe(true);
  });

  it("falha de leitura não lança — best-effort, só loga", async () => {
    const spy = vi.mocked(logger.warn);
    spy.mockClear();
    await expect(
      pausarIaPorAtendimentoManual(fakeAdmin({ selectError: { message: "boom" } }), { organizationId: ORG_ID, conversationId: CONV_ID }),
    ).resolves.toBe(false);
    expect(spy).toHaveBeenCalled();
  });

  it("falha de escrita não lança — best-effort, só loga", async () => {
    const spy = vi.mocked(logger.warn);
    spy.mockClear();
    await expect(
      pausarIaPorAtendimentoManual(fakeAdmin({ existing: null, updateError: { message: "boom" } }), { organizationId: ORG_ID, conversationId: CONV_ID }),
    ).resolves.toBe(false);
    expect(spy).toHaveBeenCalled();
  });
});
