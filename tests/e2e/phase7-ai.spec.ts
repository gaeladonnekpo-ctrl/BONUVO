import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Phase 7 — BONUVO AI (pages publiques, a11y, /admin et crons)", () => {
  test("affiche /fr/pronostics, /en/pronostics et /fr/pronostics/historique sans bandeau d'avertissement et a11y AA", async ({
    page,
  }) => {
    for (const url of ["/fr/pronostics", "/en/pronostics", "/fr/pronostics/historique"]) {
      const response = await page.goto(url, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `Statut attendu 200 sur ${url}`).toBe(200);
      await expect(page.getByRole("note")).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const axeResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const blocking = axeResults.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(blocking, `Violations axe sur ${url}`).toEqual([]);
    }
  });

  test("retourne 404 pour un fixtureId non-UUID sur /fr/pronostics/[fixtureId]", async ({
    request,
  }) => {
    const res = await request.get("/fr/pronostics/invalid-id-xyz");
    expect(res.status()).toBe(404);
  });

  test("refuse l'accès direct à /admin/pronostics et /admin/ingestion sans session TOTP", async ({
    request,
  }) => {
    for (const path of [
      "/fr/admin/pronostics",
      "/en/admin/pronostics",
      "/fr/admin/ingestion",
      "/en/admin/ingestion",
    ]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), `Route ${path}`).not.toBe(200);
      expect([302, 303, 307, 308]).toContain(res.status());
    }
  });

  test("protège les 4 endpoints cron AI contre les secrets invalides", async ({ request }) => {
    const endpoints = [
      "/api/cron/ingest-fixtures",
      "/api/cron/ingest-stats",
      "/api/cron/compute-predictions",
      "/api/cron/settle-predictions",
    ];
    for (const ep of endpoints) {
      const res = await request.post(ep, {
        headers: { "x-cron-secret": "wrong-cron-token" },
        data: {},
      });
      expect([401, 503], `Endpoint ${ep}`).toContain(res.status());
      expect(res.headers()["cache-control"]).toContain("no-store");
    }
  });
});
