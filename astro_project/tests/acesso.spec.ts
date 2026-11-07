import { test, expect } from "@playwright/test";
import {
  SESSION,
  json,
  mockAuthSession,
  seedSession,
} from "./helpers/portal";

const BEREA_SESSION = {
  ...SESSION,
  "1ipim_user_role": "subscriber",
  "1ipim_user_is_admin": "0",
  "1ipim_user_is_ministry_leader": "0",
  "1ipim_user_can_manage_grupos": "0",
  "1ipim_user_can_manage_grupos_all": "0",
  "1ipim_user_can_programacao": "0",
  "1ipim_user_can_relatorios": "0",
  "1ipim_user_can_auditoria": "0",
  "1ipim_user_has_portal_access": "0",
  "1ipim_user_can_approve_access": "0",
};

const BEREA_USER = {
  id: "9",
  nicename: "berea",
  displayName: "Leitor Berea",
  email: "berea@example.com",
  role: "subscriber",
  roles: ["subscriber"],
  ministries: [],
  isAdmin: false,
  isPastor: false,
  isMinistryLeader: false,
  canManageLivraria: false,
  canManageLivrariaStock: false,
  canManageGrupos: false,
  canManageGruposAll: false,
  canProgramacao: false,
  canRelatorios: false,
  canAuditoria: false,
  hasPortalAccess: false,
  canApproveAccess: false,
  nonce: "e2e-nonce",
};

const MINISTRIES = [
  { id: 1, nome: "Mídia" },
  { id: 2, nome: "Louvor" },
];

const REQUESTS = [
  {
    id: 5,
    user_id: 9,
    user_name: "Leitor Berea",
    user_email: "berea@example.com",
    ministry_id: 1,
    ministry_name: "Mídia",
    requested_role: "colaborador",
    status: "pendente",
    motivo: "Sirvo na mídia.",
    review_note: "",
    created_at: "2026-11-07 12:00:00",
    reviewed_at: null,
  },
];

test.describe("Acesso restrito ao Portal", () => {
  test("conta só do Berea é levada à tela de solicitação e envia pedido", async ({
    page,
    context,
  }) => {
    await seedSession(context, BEREA_SESSION);
    await mockAuthSession(page, BEREA_USER);

    let posted: { ministry_id?: number; motivo?: string } = {};
    let requestCreated = false;

    await page.route(
      "**/admin/wp-json/1ipim/v1/me/portal-access",
      async (route) => {
        if (route.request().method() === "POST") {
          posted = (route.request().postDataJSON() || {}) as typeof posted;
          requestCreated = true;
          return json(route, {
            ...REQUESTS[0],
            ministry_name: "Mídia",
          });
        }
        return json(route, {
          has_access: false,
          can_approve: false,
          is_global: false,
          request: requestCreated
            ? { ...REQUESTS[0], ministry_name: "Mídia" }
            : null,
          ministries: MINISTRIES,
        });
      },
    );

    await page.goto("/portal/", { waitUntil: "domcontentloaded" });

    await page.waitForURL("**/portal/solicitar-acesso");
    await expect(
      page.locator("h1", { hasText: "Acesso restrito à equipe" }),
    ).toBeVisible();
    await expect(page.locator("#access-request-form")).toBeVisible();

    await page.locator("#access-ministry").selectOption("1");
    await page.locator("#access-reason").fill("Sirvo na mídia.");
    await page.locator("#access-submit").click();

    await expect(page.locator("#access-status")).toContainText(
      "Solicitação em análise",
    );
    expect(posted.ministry_id).toBe(1);
    expect(posted.motivo).toBe("Sirvo na mídia.");
  });

  test("aprovador vê a fila e aprova a solicitação", async ({
    page,
    context,
  }) => {
    await seedSession(context);
    await mockAuthSession(page);

    let approved = false;

    await page.route(
      "**/admin/wp-json/1ipim/v1/admin/access-requests**",
      async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith("/approve")) {
          approved = true;
          return json(route, {
            ...REQUESTS[0],
            status: "aprovado",
          });
        }
        return json(route, approved ? [] : REQUESTS);
      },
    );

    await page.goto("/portal/solicitacoes/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#requests-list")).toContainText(
      "Leitor Berea",
    );
    await expect(page.locator("#requests-list")).toContainText("Mídia");

    await page.locator("[data-approve='5']").click();

    await expect(page.locator("#requests-empty")).toBeVisible();
    expect(approved).toBe(true);
  });
});
