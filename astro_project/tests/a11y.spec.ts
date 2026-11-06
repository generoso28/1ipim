import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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

test.describe("Acessibilidade (axe)", () => {
  for (const path of PAGES) {
    test(`${path} sem violações sérias de WCAG`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);

      const missingTitles = await page.locator("iframe").evaluateAll((frames) =>
        frames
          .filter((frame) => !frame.getAttribute("title"))
          .map((frame) => frame.getAttribute("src") || frame.id),
      );
      expect(missingTitles).toEqual([]);

      const results = await new AxeBuilder({ page })
        .exclude('iframe[src*="open.spotify.com"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const serious = results.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      );

      expect(
        serious.map((violation) => ({
          id: violation.id,
          help: violation.help,
          target: violation.nodes[0]?.target,
        })),
      ).toEqual([]);
    });
  }

  test("home mobile sem violações sérias de WCAG", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);

    const results = await new AxeBuilder({ page })
      .exclude('iframe[src*="open.spotify.com"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const serious = results.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    );

    expect(
      serious.map((violation) => ({
        id: violation.id,
        help: violation.help,
        target: violation.nodes[0]?.target,
      })),
    ).toEqual([]);
  });
});
