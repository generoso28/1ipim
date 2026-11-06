import { expect, test } from "@playwright/test";
import { json } from "./helpers/portal";

const YOUTUBE_VIDEOS = [
  {
    id: "XxAkxfMSeus",
    title: "Exposição Bíblica - Pr. Arruda",
    published: "2026-11-02T12:12:26Z",
    thumbnail: "https://i.ytimg.com/vi/XxAkxfMSeus/hqdefault.jpg",
  },
  {
    id: "U249xiWlj0s",
    title: "Culto de Celebração",
    published: "2026-10-26T12:00:00Z",
    thumbnail: "https://i.ytimg.com/vi/U249xiWlj0s/hqdefault.jpg",
  },
];

const PUBLIC_PAGES = [
  { path: "/" },
  { path: "/visitantes/" },
  { path: "/historia/" },
  { path: "/cremos/" },
  { path: "/pastores/" },
  { path: "/programacao/" },
  { path: "/eventos/" },
  { path: "/mensagens/" },
  { path: "/reflexoes/" },
  { path: "/semana-jovem/" },
  { path: "/pg/" },
  { path: "/contato/" },
];

function canonicalFor(path: string): string {
  return `https://1ipim.online${path}`;
}

test.describe("Páginas públicas", () => {
  for (const { path } of PUBLIC_PAGES) {
    test(`${path} carrega com SEO e sem erros`, async ({ page, baseURL }) => {
      const pageErrors: string[] = [];
      const localFailures: string[] = [];

      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("response", (response) => {
        if (
          response.status() >= 400 &&
          baseURL &&
          response.url().startsWith(new URL(baseURL).origin)
        ) {
          localFailures.push(`${response.status()} ${response.url()}`);
        }
      });

      if (path === "/" || path === "/mensagens/") {
        await page.route("**/api/youtube.php*", (route) =>
          json(route, { videos: YOUTUBE_VIDEOS }),
        );
      }

      if (path === "/reflexoes/") {
        await page.route("**/admin/wp-json/**", (route) => {
          const url = new URL(route.request().url());
          const apiPath = url.pathname.replace("/admin/wp-json", "");
          if (apiPath === "/wp/v2/categories") {
            return json(route, [
              { id: 5, slug: "reflexoes", name: "Reflexões" },
            ]);
          }
          if (apiPath === "/wp/v2/posts") {
            return json(route, [
              {
                id: 1,
                date: "2026-04-13T12:00:00",
                title: { rendered: "Reflexão de teste" },
                excerpt: { rendered: "<p>Resumo da reflexão.</p>" },
                content: { rendered: "<p>Conteúdo da reflexão.</p>" },
              },
            ]);
          }
          return json(route, { message: "not mocked" }, 404);
        });
      }

      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        canonicalFor(path),
      );
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        "content",
        canonicalFor(path),
      );

      const description = await page
        .locator('meta[name="description"]')
        .getAttribute("content");
      expect(description?.length ?? 0).toBeGreaterThan(50);

      const html = await page.content();
      expect(html).not.toContain("localhost:4321");
      expect(html).not.toContain("AIza");

      if (path !== "/semana-jovem/") {
        await expect(page.getByRole("contentinfo")).toContainText(
          `© ${new Date().getFullYear()}`,
        );
      } else {
        await expect(page.locator("#sj-root")).toBeVisible();
        await expect(page.locator("#sj-root img").first()).toBeVisible();
      }

      if (path === "/reflexoes/") {
        await expect(page.locator("article")).toHaveCount(1);
      }

      if (path === "/") {
        await expect(page.locator("#latest-sermon-button")).toHaveAttribute(
          "data-videoid",
          YOUTUBE_VIDEOS[0].id,
        );
      }

      if (path === "/mensagens/") {
        await expect(
          page.locator("#yt-grid .open-yt-modal").first(),
        ).toBeVisible();
      }

      expect(pageErrors).toEqual([]);
      expect(localFailures).toEqual([]);
    });
  }

  test("descrições são únicas entre as páginas", async ({ request }) => {
    const descriptions = new Set<string>();

    for (const { path } of PUBLIC_PAGES) {
      const response = await request.get(path);
      expect(response.ok()).toBeTruthy();
      const html = await response.text();
      const description = html.match(
        /<meta name="description" content="([^"]*)"/,
      )?.[1];
      expect(description?.length ?? 0).toBeGreaterThan(50);
      descriptions.add(description as string);
    }

    expect(descriptions.size).toBe(PUBLIC_PAGES.length);
  });

  test("robots e sitemap estão disponíveis", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    expect(await robots.text()).toContain("Sitemap:");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const xml = await sitemap.text();
    expect(xml).toContain("<urlset");
    expect(xml).toContain("https://1ipim.online/");
  });

  test("menu desktop abre os agrupamentos", async ({ page }) => {
    await page.goto("/programacao/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Agenda" }).hover();
    await expect(
      page.locator("nav a:visible", { hasText: "Semana Jovem" }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "A Igreja" }).hover();
    await expect(
      page.locator("nav a:visible", { hasText: "Nossa história" }).first(),
    ).toBeVisible();
  });

  test("mensagens renderiza os vídeos retornados pelo proxy", async ({
    page,
  }) => {
    await page.route("**/api/youtube.php*", (route) =>
      json(route, { videos: YOUTUBE_VIDEOS }),
    );

    await page.goto("/mensagens/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#yt-grid .open-yt-modal").first()).toBeVisible();
    await expect(page.locator("#yt-grid")).toContainText(
      YOUTUBE_VIDEOS[0].title,
    );
    await expect(page.locator("#yt-grid .open-yt-modal")).toHaveCount(
      YOUTUBE_VIDEOS.length * 2,
    );
  });

  test("404 personalizado", async ({ page }) => {
    const response = await page.goto("/pagina-que-nao-existe", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("Página não encontrada");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
  });
});

test.describe("Mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("menu mobile abre e navega", async ({ page }) => {
    await page.goto("/programacao/", { waitUntil: "load" });
    await page.waitForTimeout(500);
    await page.click("#mobile-menu-btn");
    await expect(page.locator("#mobile-menu")).toBeVisible();
    await expect(page.locator("#mobile-menu")).toContainText("Agenda");
    await expect(page.locator("#mobile-menu")).toContainText("A Igreja");
  });
});
