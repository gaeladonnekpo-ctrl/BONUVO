import { expect, test } from "@playwright/test";

const PHASE3_PROTECTED_ROUTES = [
  "/fr/admin",
  "/fr/admin/catalogue",
  "/fr/admin/bookmakers",
  "/fr/admin/offres",
  "/fr/admin/codes-promo",
  "/fr/admin/pays",
  "/fr/admin/affiliation",
  "/fr/admin/utilisateurs",
  "/fr/admin/journal",
  "/fr/admin/parametres",
];

test.describe("Phase 3 — Protection des écrans back-office et endpoint média", () => {
  test("refuse l'accès direct à toutes les sous-routes /admin sans session authentifiée TOTP", async ({
    request,
  }) => {
    for (const path of PHASE3_PROTECTED_ROUTES) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), `Route ${path} ne doit pas répondre 200`).toBe(307);
      expect(response.headers()["location"]).toContain("/connexion");
    }
  });

  test("rejette les appels non authentifiés ou cross-origin sur POST /api/admin/media", async ({
    request,
    baseURL,
  }) => {
    const crossOrigin = await request.post("/api/admin/media", {
      headers: {
        origin: "https://evil.example",
      },
      multipart: {
        file: {
          name: "fake.png",
          mimeType: "image/png",
          buffer: Buffer.from("not-a-png"),
        },
      },
    });
    expect(crossOrigin.status()).toBe(403);

    const unauth = await request.post("/api/admin/media", {
      headers: baseURL ? { origin: baseURL } : {},
      multipart: {
        file: {
          name: "fake.png",
          mimeType: "image/png",
          buffer: Buffer.from("not-a-png"),
        },
      },
    });
    expect([401, 403]).toContain(unauth.status());
  });
});
