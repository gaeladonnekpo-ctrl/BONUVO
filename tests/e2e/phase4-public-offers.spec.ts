import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Phase 4 — Catalogue public, /go/[slug], /api/events et accessibilité", () => {
  test("sert les routes publiques principales, sitemap.xml et robots.txt avec état honnête", async ({
    page,
    request,
  }) => {
    for (const path of [
      "/fr",
      "/fr/offres",
      "/fr/bookmakers",
      "/fr/codes-promo",
      "/fr/comparateur",
      "/en/offres",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), `Route ${path}`).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
    }

    const sitemapRes = await request.get("/sitemap.xml");
    expect(sitemapRes.status()).toBe(200);
    const sitemapXml = await sitemapRes.text();
    expect(sitemapXml).toContain("/fr/offres");
    expect(sitemapXml).toContain("/en/offres");

    const robotsRes = await request.get("/robots.txt");
    expect(robotsRes.status()).toBe(200);
    const robotsTxt = await robotsRes.text();
    expect(robotsTxt).toContain("Disallow: /go/");
    expect(robotsTxt).toContain("Disallow: /fr/admin/");
  });

  test("affiche CountryGate sur un pays sans couverture et état introuvable sur une offre absente", async ({
    page,
  }) => {
    await page.goto("/fr/offres?pays=JP");
    await expect(page.getByText(/Pays non couvert|aucune offre/i).first()).toBeVisible();

    await page.goto("/fr/offres/offre-inexistante-xyz");
    await expect(page.getByRole("heading", { name: /Page introuvable/i })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });

  test("audit axe-core WCAG 2.1 AA sans défaut critique/sérieux sur /fr/offres et /fr/comparateur", async ({
    page,
  }) => {
    for (const path of ["/fr/offres", "/fr/comparateur"]) {
      await page.goto(path);
      const axe = await new AxeBuilder({ page }).analyze();
      const severe = axe.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(severe, `Violations axe sur ${path}`).toEqual([]);
    }
  });

  test("bloque toute redirection ouverte et slug inconnu sur /go/[slug] (B2)", async ({
    request,
  }) => {
    for (const target of [
      "/go/slug-inconnu-test-404",
      "/go/slug-inconnu-test-404?url=https://evil.example&next=https://evil.example",
      "/go/..%2Fadmin",
    ]) {
      const res = await request.get(target, { maxRedirects: 0 });
      expect(res.status()).toBe(404);
      expect(res.headers()["location"]).toBeUndefined();
    }
  });

  test("rejette les requêtes cross-origin (403) et payloads invalides (400) sur POST /api/events", async ({
    request,
    baseURL,
  }) => {
    const crossOrigin = await request.post("/api/events", {
      headers: { origin: "https://evil.example" },
      data: { eventType: "page_view", path: "/fr/offres" },
    });
    expect(crossOrigin.status()).toBe(403);

    const invalidPath = await request.post("/api/events", {
      headers: baseURL ? { origin: baseURL } : {},
      data: { eventType: "page_view", path: "//evil.example/phish" },
    });
    expect(invalidPath.status()).toBe(400);
  });

  test("affiche les logos officiels de paiement et permet la comparaison interactive animée", async ({
    page,
  }) => {
    await page.goto("/fr/bookmakers/megapari");
    const paymentCard = page
      .locator("img[alt='Visa'], img[alt='Wave'], img[alt='Bitcoin (BTC)']")
      .first();
    await expect(paymentCard).toBeVisible();
    const imgLoaded = await paymentCard.evaluate(
      (el) => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0,
    );
    expect(imgLoaded).toBe(true);

    await page.goto("/fr/comparateur");
    await expect(page.locator("table")).toBeVisible();
    const animatedCols = page.locator("th.animate-bonuvo-col");
    await expect(animatedCols).toHaveCount(2);

    const toggleButtons = page.locator("button:has-text('·')");
    const thirdBtn = toggleButtons.nth(2);
    if ((await toggleButtons.count()) >= 3) {
      await thirdBtn.click();
      await expect(page.locator("th.animate-bonuvo-col")).toHaveCount(3);
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/fr/offres");
    const filterIds = [
      "#offers-search",
      "#offers-type",
      "#offers-payment",
      "#offers-bookmaker",
      "#offers-max-deposit",
    ];
    const boxes = await Promise.all(filterIds.map((id) => page.locator(id).boundingBox()));
    for (const box of boxes) {
      expect(box).not.toBeNull();
      expect(box!.height).toBeCloseTo(40, 0);
    }
    const tops = boxes.map((b) => b!.y);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);
  });
});
