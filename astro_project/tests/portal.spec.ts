import { expect, test, type Page, type Route } from "@playwright/test";
import {
  acceptDialogs,
  corsPreflight,
  currentMonthDate,
  getApiPath,
  json,
  MINISTRIES,
  POSTS,
  scheduleFor,
  seedSession,
  USERS,
} from "./helpers/portal";

type ApiHandler = (
  route: Route,
  path: string,
  method: string,
) => boolean | Promise<boolean>;

async function mockApi(page: Page, handler: ApiHandler): Promise<void> {
  await page.route("**/admin/wp-json/**", async (route) => {
    const { path, method } = getApiPath(route);
    if (method === "OPTIONS") {
      await corsPreflight(route);
      return;
    }
    const handled = await handler(route, path, method);
    if (!handled) await json(route, { message: `not mocked ${path}` }, 404);
  });
}

async function expectToast(page: Page, text: string): Promise<void> {
  await expect(page.locator("#toast-container")).toContainText(text);
}

test.describe("Portal", () => {
  test("sem token redireciona para o login", async ({ page }) => {
    await page.goto("/portal/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/portal\/login\/?$/);
    await expect(page.locator("#login-form")).toBeVisible();
  });

  test("login grava sessão e monta o dashboard", async ({ page }) => {
    await mockApi(page, async (route, path, method) => {
      if (path === "/jwt-auth/v1/token" && method === "POST") {
        await json(route, {
          token: "e2e-token",
          user_email: "teste@example.com",
          user_nicename: "teste",
          user_display_name: "Teste E2E",
          id: 42,
        });
        return true;
      }
      if (path === "/wp/v2/settings") {
        await json(route, {});
        return true;
      }
      if (path === "/wp/v2/users/me") {
        await json(route, {
          id: 42,
          roles: ["administrator"],
          meta: { ministries_approved: "[1,2]" },
        });
        return true;
      }
      return false;
    });

    await page.goto("/portal/login/", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await page.fill("#username", "teste");
    await page.fill("#password", "senha");
    await page.click("#submit-btn");

    await expect(page).toHaveURL(/\/portal\/?$/);
    await expect(page.locator("#dashboard-grid a")).toHaveCount(5);
    await expect(page.locator("#nav-dynamic-links a")).toHaveCount(6);

    const session = await page.evaluate(() => ({
      token: localStorage.getItem("1ipim_auth_token"),
      role: localStorage.getItem("1ipim_user_role"),
      id: localStorage.getItem("1ipim_user_id"),
      ministries: localStorage.getItem("1ipim_user_ministries_approved"),
    }));
    expect(session).toEqual({
      token: "e2e-token",
      role: "administrator",
      id: "42",
      ministries: "[1,2]",
    });
  });
});

test.describe("Portal autenticado", () => {
  test.beforeEach(async ({ context }) => {
    await seedSession(context);
  });

  test("dashboard e navegação por papel", async ({ page }) => {
    await page.goto("/portal/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Teste E2E");
    await expect(page.locator("#dashboard-grid a")).toHaveCount(5);
    await expect(page.locator("#nav-dynamic-links a")).toHaveCount(6);
    await expect(page.locator("#user-nav-role")).toHaveText("Administrador");
  });

  test("escalas: lista, calendário, participação e criação", async ({
    page,
  }) => {
    const scheduleDate = currentMonthDate(10);
    const newDate = currentMonthDate(20);
    acceptDialogs(page);

    await mockApi(page, async (route, path, method) => {
      if (path === "/wp/v2/ministerio/" && method === "GET") {
        await json(route, MINISTRIES);
        return true;
      }
      if (path === "/wp/v2/users/" && method === "GET") {
        await json(route, [
          { id: 1, name: "Teste E2E", email: "teste@example.com" },
        ]);
        return true;
      }
      if (path === "/wp/v2/escala/" && method === "GET") {
        await json(route, [scheduleFor(scheduleDate)]);
        return true;
      }
      if (path === "/wp/v2/escala/" && method === "POST") {
        await json(route, { id: 2 });
        return true;
      }
      if (path === "/wp/v2/escala/1" && method === "POST") {
        await json(route, { id: 1 });
        return true;
      }
      return false;
    });

    await page.goto("/portal/escalas/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".join-scale-btn")).toHaveCount(1);
    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    await expect(page.locator(".calendar-day")).toHaveCount(daysInMonth);

    await page.click('.view-toggle[data-view="calendar"]');
    await page.click(`.calendar-day[data-date="${scheduleDate}"]`);
    await expect(page.locator("#scale-modal")).toBeVisible();
    await expect(page.locator("#modal-title")).toContainText("10/");

    await page.click("#modal-content .join-scale-btn");
    await expectToast(page, "Seu nome foi adicionado à equipe!");

    await page.fill("#scale-title", "Nova Escala E2E");
    await page.fill("#scale-date", newDate);
    await page.fill("#scale-time", "19:00");
    await page.selectOption("#scale-ministry", "1");
    await page.check('input[name="volunteers"]');
    await page.click("#scale-add-btn");
    await expectToast(page, "Escala agendada com sucesso!");
  });

  test("voluntários: aprovar, promover e excluir", async ({ page }) => {
    test.slow();
    acceptDialogs(page);

    await mockApi(page, async (route, path, method) => {
      if (path === "/wp/v2/ministerio/" && method === "GET") {
        await json(route, MINISTRIES);
        return true;
      }
      if (path === "/wp/v2/users/" && method === "GET") {
        await json(route, USERS);
        return true;
      }
      if (path === "/wp/v2/users/2/" && method === "GET") {
        await json(route, USERS[1]);
        return true;
      }
      if (path.startsWith("/wp/v2/users/") && method === "POST") {
        await json(route, { id: 2 });
        return true;
      }
      if (path.startsWith("/wp/v2/users/") && method === "DELETE") {
        await json(route, { deleted: true });
        return true;
      }
      return false;
    });

    await page.goto("/portal/usuarios/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#users-table-body tr")).toHaveCount(2);

    await page.click(".approve-min-btn");
    await expectToast(page, "Vínculo aprovado com sucesso!");

    const promoteRow = page.locator("tr", {
      has: page.locator('.promote-btn[data-id="2"]'),
    });
    await promoteRow.locator("button:has(i.fa-ellipsis-vertical)").hover();
    await page.click('.promote-btn[data-id="2"][data-to="editor"]');
    await expectToast(page, "Promovido a Líder com Vínculo!");

    const deleteRow = page.locator("tr", {
      has: page.locator('.delete-user-btn[data-id="2"]'),
    });
    await deleteRow.locator("button:has(i.fa-ellipsis-vertical)").hover();
    await page.click('.delete-user-btn[data-id="2"]');
    await expectToast(page, "Usuário excluído");
  });

  test("ministérios: listar, criar e excluir", async ({ page }) => {
    acceptDialogs(page);

    await mockApi(page, async (route, path, method) => {
      if (path === "/wp/v2/users/" && method === "GET") {
        await json(route, [
          {
            id: 1,
            name: "Teste E2E",
            email: "teste@example.com",
            roles: ["administrator"],
            meta: { ministries_approved: '["1"]', ministries_requested: "[]" },
          },
        ]);
        return true;
      }
      if (path === "/wp/v2/ministerio/" && method === "GET") {
        await json(route, MINISTRIES);
        return true;
      }
      if (path === "/wp/v2/ministerio/" && method === "POST") {
        await json(route, { id: 3 });
        return true;
      }
      if (path.startsWith("/wp/v2/ministerio/") && method === "DELETE") {
        await json(route, { deleted: true });
        return true;
      }
      if (path.startsWith("/wp/v2/users/") && method === "POST") {
        await json(route, { id: 1 });
        return true;
      }
      return false;
    });

    await page.goto("/portal/ministerios/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#min-list > div")).toHaveCount(2);
    await expect(page.locator(".remove-member-btn")).toHaveCount(1);

    await page.fill("#min-title", "Ministério E2E");
    await page.click("#add-btn");
    await expectToast(page, "Ministério criado!");

    await page.click('.delete-min-btn[data-id="2"]');
    await expectToast(page, "Ministério removido");
  });

  test("reflexões: listar, mover para lixeira e filtrar", async ({ page }) => {
    acceptDialogs(page);

    await mockApi(page, async (route, path, method) => {
      if (path === "/wp/v2/categories/" && method === "GET") {
        await json(route, [{ id: 5 }]);
        return true;
      }
      if (path === "/wp/v2/posts/" && method === "GET") {
        const status = new URL(route.request().url()).searchParams.get(
          "status",
        );
        await json(route, status === "draft" ? [] : POSTS);
        return true;
      }
      if (path.startsWith("/wp/v2/posts/") && method === "POST") {
        await json(route, { id: 1, status: "draft" });
        return true;
      }
      if (path.startsWith("/wp/v2/posts/") && method === "DELETE") {
        await json(route, { deleted: true });
        return true;
      }
      return false;
    });

    await page.goto("/portal/gerenciar-reflexoes/", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("#posts-table-body tr")).toHaveCount(2);

    await page.click('.delete-post-btn[data-action="trash"][data-id="1"]');
    await expectToast(page, "Movido para a lixeira");

    await page.click('.filter-tab[data-filter="draft"]');
    await expect(page.locator("#no-posts")).toBeVisible();
  });

  test("nova reflexão publica e redireciona", async ({ page }) => {
    await mockApi(page, async (route, path, method) => {
      if (path === "/wp/v2/categories/" && method === "GET") {
        await json(route, [{ id: 5 }]);
        return true;
      }
      if (path === "/wp/v2/posts/" && method === "POST") {
        await json(route, { id: 10 });
        return true;
      }
      if (path === "/wp/v2/posts/" && method === "GET") {
        await json(route, []);
        return true;
      }
      return false;
    });

    await page.goto("/portal/nova-reflexao/", {
      waitUntil: "domcontentloaded",
    });
    await page.fill("#post-title", "Reflexão E2E");
    await page.fill("#post-content", "Conteúdo da reflexão E2E");
    await page.click("#publish-btn");

    await expectToast(page, "Reflexão publicada com sucesso!");
    await expect(page).toHaveURL(/\/portal\/gerenciar-reflexoes\/?$/);
  });

  test("editar reflexão carrega e salva", async ({ page }) => {
    await mockApi(page, async (route, path, method) => {
      if (path === "/wp/v2/posts/1/" && method === "GET") {
        await json(route, {
          id: 1,
          title: { raw: "Título antigo", rendered: "Título antigo" },
          content: { raw: "Conteúdo antigo", rendered: "Conteúdo antigo" },
        });
        return true;
      }
      if (path === "/wp/v2/posts/1/" && method === "POST") {
        await json(route, { id: 1 });
        return true;
      }
      if (path === "/wp/v2/categories/" && method === "GET") {
        await json(route, [{ id: 5 }]);
        return true;
      }
      if (path === "/wp/v2/posts/" && method === "GET") {
        await json(route, []);
        return true;
      }
      return false;
    });

    await page.goto("/portal/editar-reflexao/?id=1", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("#post-title")).toHaveValue("Título antigo");
    await page.fill("#post-title", "Título novo");
    await page.click("#save-btn");
    await expectToast(page, "Alterações salvas com sucesso!");
    await expect(page).toHaveURL(/\/portal\/gerenciar-reflexoes\/?$/);
  });

  test("telas administrativas restantes renderizam", async ({ page }) => {
    await mockApi(page, async (route, path, method) => {
      if (method !== "GET") return false;
      if (path === "/wp/v2/ministerio/") {
        await json(route, MINISTRIES);
        return true;
      }
      if (path === "/wp/v2/users/") {
        await json(route, USERS);
        return true;
      }
      if (path === "/wp/v2/escala/") {
        await json(route, []);
        return true;
      }
      if (path === "/wp/v2/posts/") {
        await json(route, POSTS);
        return true;
      }
      if (path === "/wp/v2/categories/") {
        await json(route, [{ id: 5 }]);
        return true;
      }
      return false;
    });

    const screens: Array<[string, RegExp]> = [
      ["/portal/livraria/", /LIVRARIA/i],
      ["/portal/novo-usuario/", /Novo Voluntário/i],
    ];

    for (const [path, heading] of screens) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1")).toContainText(heading);
    }
  });
});

test.describe("Telas de acesso", () => {
  test("login e cadastro renderizam sem sessão", async ({ page }) => {
    await mockApi(page, async (route, path, method) => {
      if (path === "/wp/v2/ministerio/" && method === "GET") {
        await json(route, MINISTRIES);
        return true;
      }
      return false;
    });

    await page.goto("/portal/login/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText(/Painel da Igreja/i);

    await page.goto("/portal/cadastro/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText(/Solicitar acesso/i);
    await expect(page.locator('input[name="ministries"]')).toHaveCount(2);
  });
});
