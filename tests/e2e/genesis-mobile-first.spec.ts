import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { carregarEnvLocal } from "../../scripts/lib/env-de-teste";
import { expect, test, type Page } from "./helpers/test";

function evidence(name: string) {
  const folder = path.join(process.cwd(), "evidence", "genesis-v177-mobile");
  fs.mkdirSync(folder, { recursive: true });
  return path.join(folder, name);
}

const RAIZ = path.resolve(__dirname, "../..");
const CREDS = path.join(RAIZ, ".e2e-creds.json");
const VIEWPORTS = [360, 375, 390, 412, 430] as const;
const ROTAS = [
  "/app/inbox",
  "/app/contacts",
  "/app/kanban",
  "/app/agenda",
  "/app/tasks",
  "/app/ai/followups",
  "/app/metrics",
  "/app/supervisao",
] as const;

type Creds = {
  org_id: string;
  password: string;
  users: Record<string, { email: string } | undefined>;
  kanban?: { pipeline_id: string };
};

async function entrarComoManager(page: Page) {
  if (!fs.existsSync(CREDS))
    throw new Error("`.e2e-creds.json` ausente — gere o seed E2E canônico.");
  const creds = JSON.parse(fs.readFileSync(CREDS, "utf8")) as Creds;
  const manager = creds.users.manager;
  if (!manager) throw new Error("seed E2E sem usuário `manager`");
  await page.goto("/login?next=%2Fapp%2Finbox");
  await page.getByLabel(/e-?mail/i).fill(manager.email);
  await page.getByLabel(/senha|password/i).fill(creds.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/app\/inbox(?:[?#]|$)/);
}

test.describe("GENESIS Mobile First — body não transborda", () => {
  test.describe.configure({ timeout: 180_000 });

  for (const width of VIEWPORTS) {
    test(`${width}px: rotas P0 cabem no viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await entrarComoManager(page);

      for (const rota of ROTAS) {
        await page.goto(rota);
        await page.waitForLoadState("domcontentloaded");
        await expect(page).toHaveURL(
          new RegExp(`${rota.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[?#].*)?$`),
        );
        await expect(page.getByRole("main")).toBeVisible();
        if (rota === "/app/supervisao") {
          await expect(page.getByTestId("genesis-supervisao-360")).toBeVisible();
        }
        // Let the hydrated layout settle: an auth redirect or SSR skeleton
        // alone cannot prove the requested route fits.
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
        );
        const medida = await page.evaluate(() => ({
          viewport: window.innerWidth,
          body: document.body.scrollWidth,
          html: document.documentElement.scrollWidth,
        }));
        expect(
          Math.max(medida.body, medida.html),
          `${rota} criou overflow estrutural em ${width}px`,
        ).toBeLessThanOrEqual(medida.viewport + 1);
      }
    });
  }
});

test.describe("GENESIS Mobile — jornadas operacionais", () => {
  test.describe.configure({ timeout: 180_000 });
  test.use({ viewport: { width: 390, height: 844 } });

  test("Supervisão aplica filtros reais, detalha a população e recupera a fonte", async ({
    page,
  }, testInfo) => {
    await entrarComoManager(page);
    await page.goto("/app/supervisao");
    const section = page.locator('section[aria-labelledby="analise-supervisao"]');
    await expect(section.getByText("Fonte atualizada em")).toBeVisible({ timeout: 30_000 });
    await section.getByLabel("Régua de espera (minutos)").fill("30");
    await section.getByLabel("Régua sem atividade (dias)").fill("7");
    const response = page.waitForResponse(
      (r) => r.url().includes("/metrics/supervisao?") && r.url().includes("wait_minutes=30"),
    );
    await section.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    expect((await response).status()).toBe(200);
    const calls = page.waitForResponse(
      (r) => r.url().includes("/metrics/supervisao?") && r.url().includes("kind=calls"),
    );
    await section.getByRole("button", { name: /Chamadas de IA/ }).click();
    const body = await (await calls).json();
    await expect(section.locator("#supervisao-populacao h3")).toContainText(
      String(body.data.totals.calls ?? 0),
    );
    await page.route("**/api/v1/metrics/supervisao?**", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "read_failed", message: "Falha controlada da fonte" },
        }),
      }),
    );
    await section.getByRole("button", { name: /Falhas no período/ }).click();
    await expect(section.getByText("Fonte indisponível. Nenhum zero foi inferido.")).toBeVisible({
      timeout: 30_000,
    });
    await page.unroute("**/api/v1/metrics/supervisao?**");
    await section.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(section.getByText("Fonte atualizada em")).toBeVisible({ timeout: 30_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      391,
    );
    await section.screenshot({ path: testInfo.outputPath("supervisao-mobile.png") });
    await section.screenshot({ path: evidence("supervisao-mobile.png") });
  });

  test("CRM cria pela tela mobile e persiste após recarregar", async ({ page }, testInfo) => {
    let creds = JSON.parse(fs.readFileSync(CREDS, "utf8")) as Creds;
    if (!creds.kanban) {
      execFileSync(
        process.execPath,
        ["node_modules/tsx/dist/cli.mjs", "scripts/seed-e2e-kanban.ts"],
        { stdio: "inherit" },
      );
      creds = JSON.parse(fs.readFileSync(CREDS, "utf8")) as Creds;
    }
    if (!creds.kanban) throw new Error("Seed canônico sem funil de teste");
    const env = carregarEnvLocal();
    const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const title = `Negócio mobile ${randomUUID()}`;
    let id: string | undefined;
    try {
      await entrarComoManager(page);
      await page.goto(`/app/pipelines/${creds.kanban.pipeline_id}`);
      await page.getByRole("button", { name: "Novo Lead", exact: true }).click();
      await page.locator("#title").fill(title);
      const response = page.waitForResponse(
        (r) => r.url().endsWith("/api/v1/leads") && r.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Criar lead", exact: true }).click();
      const created = await response;
      expect(created.status()).toBe(201);
      id = (await created.json()).data.id;
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      const persisted = await admin
        .from("crm_leads")
        .select("title")
        .eq("organization_id", creds.org_id)
        .eq("id", id!)
        .single();
      expect(persisted.error).toBeNull();
      expect(persisted.data?.title).toBe(title);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        391,
      );
      await page.screenshot({ path: testInfo.outputPath("crm-mobile.png") });
      await page.screenshot({ path: evidence("crm-mobile.png") });
    } finally {
      const cleanup = admin
        .from("crm_leads")
        .delete()
        .eq("organization_id", creds.org_id)
        .eq("title", title);
      const { error } = await cleanup;
      if (error) throw new Error("Falha ao remover fixture do CRM: " + error.message);
    }
  });
  test("Tarefas cria, prioriza, conclui e reabre com persistência no mobile", async ({
    page,
  }, testInfo) => {
    const creds = JSON.parse(fs.readFileSync(CREDS, "utf8")) as Creds;
    const env = carregarEnvLocal();
    const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const title = `Tarefa mobile ${randomUUID()}`;
    try {
      await entrarComoManager(page);
      await page.goto("/app/tasks");
      await page.getByRole("button", { name: "Nova tarefa", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("O que precisa ser feito").fill(title);
      await dialog.getByLabel("Prioridade").click();
      await page.getByRole("option", { name: "Urgente", exact: true }).click();
      const create = page.waitForResponse(
        (r) => r.url().endsWith("/api/v1/tasks") && r.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
      const response = await create;
      expect(response.status()).toBe(201);
      const task = (await response.json()).data.task;
      expect(task.priority).toBe("urgent");
      const row = page.locator("div.group").filter({ hasText: title });
      await expect(row.getByText("Urgente", { exact: true })).toBeVisible();
      const target = await row.getByRole("checkbox").boundingBox();
      expect(target?.width).toBeGreaterThanOrEqual(44);
      expect(target?.height).toBeGreaterThanOrEqual(44);
      await expect(row.getByRole("button", { name: "Editar a tarefa" })).toBeVisible();
      const done = page.waitForResponse(
        (r) => r.url().endsWith(`/api/v1/tasks/${task.id}`) && r.request().method() === "PATCH",
      );
      await row.getByRole("checkbox", { name: "Marcar como concluída" }).click();
      expect((await done).status()).toBe(200);
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "Concluída", exact: true }).click();
      await expect(row.getByRole("checkbox", { name: "Reabrir a tarefa" })).toBeChecked();
      const reopened = page.waitForResponse(
        (r) => r.url().endsWith(`/api/v1/tasks/${task.id}`) && r.request().method() === "PATCH",
      );
      await row.getByRole("checkbox", { name: "Reabrir a tarefa" }).click();
      expect((await reopened).status()).toBe(200);
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "Em aberto", exact: true }).click();
      await page.reload();
      await expect(row.getByRole("checkbox", { name: "Marcar como concluída" })).not.toBeChecked();
      const persisted = await admin
        .from("crm_tasks")
        .select("status,priority")
        .eq("organization_id", creds.org_id)
        .eq("id", task.id)
        .single();
      expect(persisted.error).toBeNull();
      expect(persisted.data).toMatchObject({ status: "pending", priority: "urgent" });
      expect(
        await page.evaluate(() =>
          Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        ),
      ).toBeLessThanOrEqual(391);
      await page.screenshot({ path: testInfo.outputPath("tarefas-mobile.png") });
      await page.screenshot({ path: evidence("tarefas-mobile.png") });
    } finally {
      const { error } = await admin
        .from("crm_tasks")
        .delete()
        .eq("organization_id", creds.org_id)
        .eq("title", title);
      if (error) throw new Error("Falha na limpeza da tarefa mobile");
    }
  });
});
