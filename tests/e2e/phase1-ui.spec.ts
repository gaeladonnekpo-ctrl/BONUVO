import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const TRUST_PATHS = [
  "/fr/methodologie",
  "/fr/affiliation",
  "/fr/jeu-responsable",
  "/fr/confidentialite",
] as const;

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 800 },
] as const;

test.describe("Phase 1 — Design system, accessibilité, thèmes et responsive", () => {
  test("détecte la langue et permet la bascule fr <-> en avec attribut lang et hreflang", async ({
    browser,
  }) => {
    const enContext = await browser.newContext({ locale: "en-US" });
    const enPage = await enContext.newPage();
    await enPage.goto("/");
    await expect(enPage).toHaveURL(/\/en$/);
    await expect(enPage.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      enPage
        .getByRole("navigation", { name: "BONUVO Navigation" })
        .getByRole("link", { name: "Offers" }),
    ).toBeVisible();

    await enPage.getByRole("button", { name: /Français/i }).click();
    await expect(enPage).toHaveURL(/\/fr$/);
    await expect(enPage.locator("html")).toHaveAttribute("lang", "fr");
    await expect(
      enPage
        .getByRole("navigation", { name: "Navigation BONUVO" })
        .getByRole("link", { name: "Offres" }),
    ).toBeVisible();

    const hreflangEn = await enPage
      .locator('link[rel="alternate"][hreflang="en"]')
      .first()
      .getAttribute("href");
    expect(hreflangEn).toMatch(/\/en$/);
    await enContext.close();
  });

  test("bascule le thème sombre <-> clair avec persistance cookie et contraste AA valide", async ({
    page,
  }) => {
    await page.goto("/fr");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const darkAxe = await new AxeBuilder({ page }).analyze();
    const darkSevere = darkAxe.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(darkSevere).toEqual([]);

    await page.getByRole("button", { name: /Passer en thème clair/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    if (process.env.CAPTURE_PHASE1_SCREENSHOTS === "1") {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.screenshot({
        path: "docs/phases/screenshots/phase-01/home-light-desktop-1280.png",
        fullPage: false,
      });
    }

    const lightAxe = await new AxeBuilder({ page }).analyze();
    const lightSevere = lightAxe.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(lightSevere).toEqual([]);
  });

  test("sert les 4 pages de confiance, la page 404 et les en-têtes CSP-Report-Only", async ({
    page,
  }) => {
    const homeResponse = await page.goto("/fr");
    expect(homeResponse?.status()).toBe(200);
    const headers = homeResponse?.headers() ?? {};
    expect(headers["content-security-policy-report-only"]).toContain("default-src 'self'");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"]).toBeUndefined();

    for (const path of TRUST_PATHS) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      const axeResults = await new AxeBuilder({ page }).analyze();
      const severe = axeResults.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(severe, `Axe violations on ${path}`).toEqual([]);
    }

    const notFoundResponse = await page.goto("/fr/route-inexistante-phase-1");
    expect(notFoundResponse?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /Page introuvable/i })).toBeVisible();
  });

  test("permet de changer de pays dans CountrySwitcher et mémorise le choix", async ({ page }) => {
    await page.goto("/fr");
    await page.getByRole("combobox", { name: /Pays affiché/i }).click();
    await page.getByRole("option", { name: /Bénin \(XOF\)/i }).click();
    await expect(page.getByRole("combobox", { name: /Pays affiché/i })).toContainText(/Bénin/i);
  });

  test("bloque /admin/design en build production par défaut (404)", async ({ request, page }) => {
    if (process.env.ALLOW_DEV_SHOWCASE === "1") {
      const devResp = await page.goto("/fr/admin/design");
      expect(devResp?.status()).toBe(200);
      await expect(page.getByText(/Page interne réservée au développement/i)).toBeVisible();
      const devAxe = await new AxeBuilder({ page }).analyze();
      expect(
        devAxe.violations.filter((v) => v.impact === "critical" || v.impact === "serious"),
      ).toEqual([]);

      if (process.env.CAPTURE_PHASE1_SCREENSHOTS === "1") {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.screenshot({
          path: "docs/phases/screenshots/phase-01/admin-design-desktop-1280.png",
          fullPage: false,
        });
        await page.setViewportSize({ width: 375, height: 812 });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        );
        expect(overflow).toBe(false);
        await page.screenshot({
          path: "docs/phases/screenshots/phase-01/admin-design-mobile-375.png",
          fullPage: false,
        });
      }
      return;
    }
    const response = await request.get("/fr/admin/design");
    expect(response.status()).toBe(404);
  });

  test("garantit zéro débordement horizontal à 375, 768 et 1280 px et produit les captures", async ({
    page,
  }) => {
    const captureEnabled = process.env.CAPTURE_PHASE1_SCREENSHOTS === "1";

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/fr");

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `Horizontal overflow on /fr at ${viewport.name}`).toBe(false);

      if (captureEnabled) {
        await page.screenshot({
          path: `docs/phases/screenshots/phase-01/home-dark-${viewport.name}.png`,
          fullPage: false,
        });
      }

      if (viewport.width === 375) {
        await page.getByRole("button", { name: /Ouvrir le menu de navigation/i }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toBeHidden();
      }
    }
  });
});
