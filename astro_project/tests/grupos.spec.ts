import { test, expect } from "@playwright/test";
import {
  corsPreflight,
  json,
  mockAuthSession,
  seedSession,
} from "./helpers/portal";

const GROUPS = [
  {
    id: 1,
    slug: "koinonia",
    nome: "Koinonia",
    descricao: "",
    publico_alvo: "Mulheres",
    frequencia: "Semanal",
    dia_semana: 2,
    horario: "14:00",
    local: "",
    contato: "5535988613046",
    responsavel: "Milka",
    imagem: "/assets/img/pgs/koinonia.jpeg",
    status: "ativo",
  },
  {
    id: 2,
    slug: "peniel",
    nome: "Peniel",
    descricao: "",
    publico_alvo: "Mulheres",
    frequencia: "Semanal",
    dia_semana: 2,
    horario: "14:30",
    local: "",
    contato: "5535988613046",
    responsavel: "Ester",
    imagem: "/assets/img/pgs/peniel.jpeg",
    status: "ativo",
  },
];

function mockGroups(page: import("@playwright/test").Page, prefix: string): Promise<void> {
  return page.route(`**/admin/wp-json/1ipim/v1/${prefix}`, (route) => {
    if (route.request().method() === "OPTIONS") return corsPreflight(route);
    return json(route, GROUPS);
  });
}

test.describe("Pequenos Grupos", () => {
  test("página pública lista os grupos", async ({ page }) => {
    await mockGroups(page, "grupos");
    await page.goto("/pg/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#pg-grid h5")).toHaveCount(2);
    await expect(page.locator("#pg-grid")).toContainText("Koinonia");
    await expect(page.locator("#pg-grid")).toContainText("Peniel");
  });

  test("portal lista os grupos e abre o formulário", async ({ page, context }) => {
    await seedSession(context);
    await mockAuthSession(page);
    await mockGroups(page, "admin/grupos");

    await page.goto("/portal/pequenos-grupos/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#grupos-grid")).toContainText("Koinonia");
    await page.locator("#novo-grupo").click();
    await expect(page.locator("#grupo-modal")).toBeVisible();
    await expect(page.locator("#grupo-modal-title")).toHaveText("Novo grupo");
  });
});
