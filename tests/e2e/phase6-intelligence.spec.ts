import { expect, test } from "@playwright/test";

test.describe("Phase 6 — BONUVO INTELLIGENCE (sécurité /admin/statistiques, export CSV et cron)", () => {
  test("refuse l'accès direct à /admin/statistiques et /api/admin/export/* sans session TOTP", async ({
    request,
  }) => {
    for (const path of ["/fr/admin/statistiques", "/en/admin/statistiques"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), `Route ${path}`).not.toBe(200);
      expect([302, 303, 307, 308]).toContain(res.status());
    }

    const exportUnauth = await request.get("/api/admin/export/daily-overview");
    expect([401, 403]).toContain(exportUnauth.status());
    expect(exportUnauth.headers()["cache-control"]).toContain("no-store");

    const exportUnknown = await request.get("/api/admin/export/rapport-inexistant");
    expect(exportUnknown.status()).toBe(404);
  });

  test("protège POST /api/cron/aggregate-metrics contre les appels sans secret valide", async ({
    request,
  }) => {
    const res = await request.post("/api/cron/aggregate-metrics", {
      headers: { "x-cron-secret": "invalid-secret-attempt" },
      data: { fromDate: "2026-11-15", toDate: "2026-11-16" },
    });
    expect([401, 503]).toContain(res.status());
    expect(res.headers()["cache-control"]).toContain("no-store");
  });
});
