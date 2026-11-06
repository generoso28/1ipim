import { expect, test, type Page } from "@playwright/test";

const PRODUCTION = "https://1ipim.online";

const PAGES = [
  "/",
  "/visitantes/",
  "/historia/",
  "/cremos/",
  "/pastores/",
  "/programacao/",
  "/eventos/",
  "/mensagens/",
  "/reflexoes/",
  "/semana-jovem/",
  "/pg/",
  "/contato/",
  "/privacidade/",
];

type JsonLd = Record<string, unknown>;

async function jsonLd(page: Page): Promise<JsonLd[]> {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();

  return blocks.map((block) => JSON.parse(block) as JsonLd);
}

function byType(items: JsonLd[], type: string): JsonLd[] {
  return items.filter((item) => {
    const value = item["@type"];
    return Array.isArray(value) ? value.includes(type) : value === type;
  });
}

test.describe("SEO — metadados por página", () => {
  for (const path of PAGES) {
    test(`${path} tem título, descrição, canonical e JSON-LD`, async ({
      page,
    }) => {
      await page.goto(`${path}?v=${Date.now()}`, { waitUntil: "domcontentloaded" });

      const title = await page.title();
      expect(title.length).toBeGreaterThan(10);
      expect(title.length).toBeLessThanOrEqual(65);

      const description = await page
        .locator('meta[name="description"]')
        .getAttribute("content");
      expect(description).toBeTruthy();
      expect(description!.length).toBeGreaterThanOrEqual(90);
      expect(description!.length).toBeLessThanOrEqual(165);

      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute("href");
      expect(canonical).toBe(`${PRODUCTION}${path}`);

      await expect(page.locator('meta[name="keywords"]')).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "index, follow",
      );
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        "content",
        title,
      );
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        "content",
        canonical,
      );
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image",
      );
      await expect(page.locator('link[hreflang="pt-BR"]')).toHaveAttribute(
        "href",
        canonical,
      );

      const data = await jsonLd(page);
      expect(byType(data, "Church").length).toBeGreaterThan(0);
      expect(byType(data, "WebSite").length).toBeGreaterThan(0);
      if (path !== "/") {
        expect(byType(data, "BreadcrumbList").length).toBeGreaterThan(0);
      }
    });
  }

  test("títulos e descrições são únicos", async ({ page }) => {
    const titles: string[] = [];
    const descriptions: string[] = [];

    for (const path of PAGES) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      titles.push(await page.title());
      descriptions.push(
        (await page
          .locator('meta[name="description"]')
          .getAttribute("content")) || "",
      );
    }

    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});

test.describe("SEO — entidade local", () => {
  test("home descreve a igreja de Machado com endereço, geo e horários", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const data = await jsonLd(page);
    const church = byType(data, "Church")[0] as any;

    expect(church.name).toContain("Primeira Igreja Presbiteriana");
    expect(church.alternateName).toContain("1IPIM");
    expect(church.address.addressLocality).toBe("Machado");
    expect(church.address.addressRegion).toBe("MG");
    expect(church.telephone).toContain("98861");
    expect(church.geo.latitude).toBeLessThan(0);
    expect(church.geo.longitude).toBeLessThan(0);
    expect(
      (church.sameAs as unknown[]).length,
    ).toBeGreaterThanOrEqual(3);
    expect(
      (church.openingHoursSpecification as unknown[]).length,
    ).toBeGreaterThanOrEqual(4);
    expect(
      (church.areaServed as Array<{ name: string }>).map((item) => item.name),
    ).toContain("Machado");

  });

  test("visitantes tem FAQPage com as dúvidas visíveis", async ({ page }) => {
    await page.goto("/visitantes/", { waitUntil: "domcontentloaded" });

    const data = await jsonLd(page);
    const faq = byType(data, "FAQPage")[0] as any;
    const questions = faq.mainEntity as Array<{ name: string }>;

    expect(questions.length).toBe(7);
    expect(questions.map((item) => item.name)).toContain(
      "Qual é a denominação da igreja?",
    );
  });

  test("programação expõe os cultos semanais como Event", async ({ page }) => {
    await page.goto("/programacao/", { waitUntil: "domcontentloaded" });

    const data = await jsonLd(page);
    const events = byType(data, "Event");
    expect(events.length).toBeGreaterThanOrEqual(4);

    for (const event of events) {
      expect(event.name).toBeTruthy();
      expect(String(event.startDate)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(event.location).toBeTruthy();
    }
  });

  test("pastores expõe Person", async ({ page }) => {
    await page.goto("/pastores/", { waitUntil: "domcontentloaded" });

    const data = await jsonLd(page);
    const people = byType(data, "Person");
    expect(people.length).toBeGreaterThanOrEqual(5);
    expect(people.map((person) => person.name)).toContain(
      "Isaías Garcia Vieira",
    );
  });

  test("mensagens expõe VideoObject", async ({ page }) => {
    await page.goto("/mensagens/", { waitUntil: "domcontentloaded" });

    const data = await jsonLd(page);
    const videos = byType(data, "VideoObject");
    expect(videos.length).toBeGreaterThan(0);

    for (const video of videos.slice(0, 3)) {
      expect(video.name).toBeTruthy();
      expect(video.uploadDate).toBeTruthy();
      expect(String(video.embedUrl)).toContain("youtube.com/embed/");
    }
  });

  test("contato expõe ContactPage", async ({ page }) => {
    await page.goto("/contato/", { waitUntil: "domcontentloaded" });

    const data = await jsonLd(page);
    expect(byType(data, "ContactPage").length).toBe(1);
  });

  test("reflexões expõe CollectionPage", async ({ page }) => {
    await page.goto("/reflexoes/", { waitUntil: "domcontentloaded" });

    const data = await jsonLd(page);
    expect(byType(data, "CollectionPage").length).toBe(1);
  });
});

test.describe("SEO — sitemap e robots", () => {
  test("sitemap inclui todas as páginas públicas", async ({ request }) => {
    const response = await request.get(`/sitemap.xml?v=${Date.now()}`);
    expect(response.ok()).toBeTruthy();
    const text = await response.text();

    for (const path of PAGES) {
      expect(text).toContain(`${PRODUCTION}${path}`);
    }
  });

  test("robots bloqueia admin, portal e API", async ({ request }) => {
    const response = await request.get(`/robots.txt?v=${Date.now()}`);
    expect(response.ok()).toBeTruthy();
    const text = await response.text();

    expect(text).toContain("Disallow: /admin/");
    expect(text).toContain("Disallow: /portal/");
    expect(text).toContain("Disallow: /api/");
    expect(text).toContain(`Sitemap: ${PRODUCTION}/sitemap.xml`);
  });
});
