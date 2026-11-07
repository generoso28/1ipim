import { test, expect } from "@playwright/test";
import {
  SESSION,
  corsPreflight,
  json,
  mockAuthSession,
  seedSession,
} from "./helpers/portal";
import type { Route } from "@playwright/test";

const AUDIT_ITEMS = [
  {
    id: 10,
    actor_id: 1,
    actor_name: "Teste E2E",
    action: "grupo_encontro_create",
    target_type: "grupo",
    target_id: 3,
    before_json: "",
    after_json: '{"nome":"Koinonia","publico_presente":12}',
    created_at: "2026-11-07 10:00:00",
  },
];

const REPORT_OPTIONS = {
  grupos: [
    { id: 3, nome: "Koinonia" },
    { id: 4, nome: "Peniel" },
  ],
  ministerios: [{ id: 1, nome: "Mídia" }],
  escopo: { global: true, "ministérios": 0, grupos: 0 },
};

const FREQUENCIA = {
  grupos: [
    {
      grupo_id: 3,
      grupo: "Koinonia",
      encontros: 2,
      total_presentes: 24,
      media: 12,
      ultimo_encontro: "2026-11-01",
    },
  ],
  encontros: [
    {
      id: 1,
      grupo_id: 3,
      grupo: "Koinonia",
      data: "2026-11-01",
      tema: "Salmo 23",
      preletor: "Ana",
      publico_presente: 12,
      presentes: "Ana, João",
    },
  ],
};

const LEADER_SESSION = {
  ...SESSION,
  "1ipim_user_role": "lider",
  "1ipim_user_is_admin": "0",
  "1ipim_user_is_ministry_leader": "1",
  "1ipim_user_can_manage_grupos": "0",
  "1ipim_user_can_manage_grupos_all": "0",
  "1ipim_user_can_programacao": "0",
  "1ipim_user_can_relatorios": "1",
  "1ipim_user_can_auditoria": "1",
};

const LEADER_USER = {
  id: "2",
  nicename: "lider",
  displayName: "Líder E2E",
  email: "lider@example.com",
  role: "lider",
  roles: ["lider"],
  ministries: [1],
  isAdmin: false,
  isPastor: false,
  isMinistryLeader: true,
  canManageLivraria: false,
  canManageLivrariaStock: false,
  canManageGrupos: false,
  canManageGruposAll: false,
  canProgramacao: false,
  canRelatorios: true,
  canAuditoria: true,
  nonce: "e2e-nonce",
};

async function mockReports(page: import("@playwright/test").Page): Promise<void> {
  await page
    .route("**/admin/wp-json/1ipim/v1/admin/audit**", (route) =>
      json(route, { items: AUDIT_ITEMS, total: 1, page: 1, pages: 1 }),
    );

  await page.route(
    "**/admin/wp-json/1ipim/v1/admin/relatorios/opcoes",
    (route) => json(route, REPORT_OPTIONS),
  );

  await page.route(
    "**/admin/wp-json/1ipim/v1/admin/relatorios/frequencia**",
    (route: Route) => {
        if (route.request().method() === "OPTIONS") return corsPreflight(route);
        const url = new URL(route.request().url());
        if (url.searchParams.get("format") === "csv") {
          return route.fulfill({
            status: 200,
            headers: {
              "Access-Control-Allow-Origin":
                route.request().headers()["origin"] || "*",
              "Access-Control-Allow-Credentials": "true",
              Vary: "Origin",
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": 'attachment; filename="frequencia-pg.csv"',
            },
            body: "Grupo;Data;Tema\nKoinonia;2026-11-01;Salmo 23\n",
          });
        }
        return json(route, FREQUENCIA);
      },
  );
}

test.describe("Auditoria e relatórios", () => {
  test("admin alterna para a aba de relatórios e baixa o CSV", async ({
    page,
    context,
  }) => {
    await seedSession(context);
    await mockAuthSession(page);
    await mockReports(page);

    await page.goto("/portal/auditoria/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#audit-table-body")).toContainText(
      "Teste E2E",
    );
    await expect(page.locator("#audit-table-body")).toContainText(
      "Registrou encontro",
    );

    await page.locator("#tab-btn-relatorios").click();
    await expect(page.locator("#tab-panel-relatorios")).toBeVisible();

    await page.locator("#report-run").click();
    await expect(page.locator("#report-tbody")).toContainText("Koinonia");
    await expect(page.locator("#report-tbody")).toContainText("Salmo 23");
    await expect(page.locator("#report-csv")).toBeEnabled();

    const csvRequest = page.waitForRequest(
      (request) =>
        request.url().includes("/admin/relatorios/frequencia") &&
        request.url().includes("format=csv"),
    );
    await page.locator("#report-csv").click();
    await csvRequest;
    await expect(page.locator("#report-feedback")).toContainText("CSV baixado");
  });

  test("líder acessa auditoria e relatórios, sem a área de voluntários", async ({
    page,
    context,
  }) => {
    await seedSession(context, LEADER_SESSION);
    await mockAuthSession(page, {
      ...LEADER_USER,
    });
    await mockReports(page);

    await page.goto("/portal/auditoria/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#audit-table-body")).toContainText(
      "Registrou encontro",
    );
    await expect(page.locator("#tab-btn-relatorios")).toBeVisible();

    await page.goto("/portal/", { waitUntil: "domcontentloaded" });
    await expect(
      page.locator('#nav-dynamic-links a[href="/portal/auditoria"]'),
    ).toBeVisible();
    await expect(
      page.locator('#nav-dynamic-links a[href="/portal/usuarios"]'),
    ).toHaveCount(0);
  });
});
