import { expect, test } from "@playwright/test";

test.describe("Phase 5 — Protection admin affiliation et endpoints postbacks/webhooks", () => {
  test("refuse l'accès direct aux écrans Phase 5 sans session administrateur TOTP", async ({
    request,
  }) => {
    for (const path of [
      "/fr/admin/campagnes",
      "/fr/admin/postbacks",
      "/fr/admin/conversions",
      "/fr/admin/commissions",
      "/fr/admin/imports",
    ]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), `Route ${path}`).not.toBe(200);
      expect([302, 303, 307, 308]).toContain(res.status());
    }
  });

  test("gère les réseaux inconnus (404), charges > 64 Ko (413) et raffale concurrente sans erreur 500", async ({
    request,
  }) => {
    const unknownGet = await request.get("/api/postbacks/reseau-inexistant-phase5");
    expect(unknownGet.status()).toBe(404);
    expect(unknownGet.headers()["cache-control"]).toContain("no-store");

    const unknownWebhook = await request.post("/api/webhooks/fournisseur-inexistant-phase5", {
      data: { event: "ftd" },
    });
    expect(unknownWebhook.status()).toBe(404);

    const oversized = await request.post("/api/postbacks/reseau-inexistant-phase5", {
      data: "x".repeat(66 * 1024),
    });
    expect(oversized.status()).toBe(413);

    const burstResponses = await Promise.all(
      Array.from({ length: 12 }, (_, idx) =>
        request.get(`/api/postbacks/reseau-load-test-${idx}?status=lead`),
      ),
    );
    for (const res of burstResponses) {
      expect([404, 429]).toContain(res.status());
    }
  });
});
