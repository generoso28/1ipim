import { expect, test, type Route } from "@playwright/test";
import { json, MINISTRIES } from "./helpers/portal";

test.describe("Cadastro", () => {
  test("voluntário envia ministérios e honeypot para a API correta", async ({
    page,
  }) => {
    let payload: Record<string, unknown> | null = null;

    await page.route("**/wp-json/wp/v2/ministerio/**", async (route) => {
      await json(route, MINISTRIES);
    });
    await page.route("**/wp-json/1ipim/v1/registrar", async (route: Route) => {
      payload = route.request().postDataJSON() as Record<string, unknown>;
      await json(route, {
        success: true,
        message: "Cadastro realizado! Aguarde a aprovação.",
        user_id: 99,
      });
    });

    await page.goto("/portal/cadastro/", { waitUntil: "domcontentloaded" });
    await page.fill("#reg-name", "Maria Teste");
    await page.fill("#reg-user", "maria_teste");
    await page.fill("#reg-email", "maria@example.com");
    await page.fill("#reg-pass", "senha12345");
    await expect(page.locator('input[name="ministries"]')).toHaveCount(2);
    await page.locator('input[name="ministries"][value="1"]').check();
    await page.click("#reg-submit-btn");

    await expect(page.locator("#reg-feedback")).toContainText(
      "Cadastro realizado",
    );
    expect(payload).toMatchObject({
      username: "maria_teste",
      email: "maria@example.com",
      display_name: "Maria Teste",
      ministries: ["1"],
      website: "",
    });
  });

  test("Bible Rats cria conta e pede confirmação de e-mail", async ({
    page,
  }) => {
    let payload: Record<string, unknown> | null = null;

    await page.route(
      "**/wp-json/1ipim/v1/registrar-assinante",
      async (route) => {
        payload = route.request().postDataJSON() as Record<string, unknown>;
        await json(route, {
          success: true,
          message:
            "Conta criada! Confirme seu e-mail para ativar o acesso ao Bible Rats.",
          user_id: 100,
          verification_sent: true,
        });
      },
    );

    await page.goto("/bible-rats/", { waitUntil: "domcontentloaded" });
    await page.fill("#br-name", "João Teste");
    await page.fill("#br-username", "joao_bible");
    await page.fill("#br-email", "joao@example.com");
    await page.fill("#br-password", "senha12345");
    await page.click("#br-submit");

    await expect(page.locator("#br-feedback")).toContainText(
      "Confirme seu e-mail",
    );
    expect(payload).toMatchObject({
      username: "joao_bible",
      email: "joao@example.com",
      display_name: "João Teste",
      website: "",
    });
  });
});
