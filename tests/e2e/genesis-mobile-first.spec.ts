import * as fs from "node:fs";
import * as path from "node:path";
import { expect, test, type Page } from "./helpers/test";

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

type Creds = { password: string; users: Record<string, { email: string } | undefined> };

async function entrarComoManager(page: Page) {
  if (!fs.existsSync(CREDS))
    throw new Error("`.e2e-creds.json` ausente — gere o seed E2E canônico.");
  const creds = JSON.parse(fs.readFileSync(CREDS, "utf8")) as Creds;
  const manager = creds.users.manager;
  if (!manager) throw new Error("seed E2E sem usuário `manager`");
  await page.goto("/login");
  await page.getByLabel(/e-?mail/i).fill(manager.email);
  await page.getByLabel(/senha|password/i).fill(creds.password);
  await page.getByRole("button", { name: /entrar|login|sign in/i }).click();
  await page.waitForURL(/\/app(?:\/|$)/);
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
