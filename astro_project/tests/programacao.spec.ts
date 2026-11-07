import { test, expect } from "@playwright/test";
import {
  corsPreflight,
  json,
  mockAuthSession,
  seedSession,
} from "./helpers/portal";

const ITEMS = [
  {
    id: 1,
    tipo: "semanal",
    titulo: "Culto Solene",
    subtitulo: "",
    descricao: "Culto de adoração e pregação.",
    horario: "19:00",
    dia_semana: 0,
    data: null,
    local: "Templo",
    link: "",
    tag: "Orações",
    tag_cor: "#7ace9f",
    tipo_evento: "",
    status: "publicado",
    ordem: 20,
  },
  {
    id: 2,
    tipo: "evento",
    titulo: "Conferência Missionária",
    subtitulo: "",
    descricao: "",
    horario: "",
    dia_semana: null,
    data: `${new Date().getFullYear()}-10-23`,
    local: "",
    link: "",
    tag: "",
    tag_cor: "",
    tipo_evento: "conference",
    status: "publicado",
    ordem: 0,
  },
];

function mockProgramacao(page: import("@playwright/test").Page): Promise<void> {
  return page
    .route("**/admin/wp-json/1ipim/v1/admin/programacao", (route) => {
      if (route.request().method() === "OPTIONS") return corsPreflight(route);
      return json(route, ITEMS);
    })
    .then(() => undefined);
}

test.describe("Programação", () => {
  test("página pública mostra os cultos semanais", async ({ page }) => {
    await page.goto("/programacao/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#weekly-groups")).toContainText("Culto Solene");
    await expect(page.locator("#weekly-groups")).toContainText("Domingo");
  });

  test("página de eventos mostra o calendário do ano corrente", async ({ page }) => {
    const year = new Date().getFullYear();
    await page.goto("/eventos/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#conteudo")).toContainText(`Calendário ${year}`);
    await expect(page.locator("#conteudo")).toContainText("Acampamento Maanaim");
  });

  test("portal lista e abre o formulário de evento", async ({ page, context }) => {
    await seedSession(context);
    await mockAuthSession(page);
    await mockProgramacao(page);

    await page.goto("/portal/programacao/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#semanal-lista")).toContainText("Culto Solene");
    await expect(page.locator("#evento-lista")).toContainText("Conferência Missionária");

    await page.locator("#novo-evento").click();
    await expect(page.locator("#programacao-modal")).toBeVisible();
    await expect(page.locator("#field-data")).toBeVisible();
    await expect(page.locator("#field-dia")).toBeHidden();
  });
});
