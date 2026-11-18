import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const AUTH_PATHS = [
  "/fr/connexion",
  "/fr/inscription",
  "/fr/mot-de-passe-oublie",
  "/fr/reinitialisation",
  "/fr/verification",
  "/fr/double-authentification",
  "/en/connexion",
] as const;

test.describe("Phase 2 — Protection /admin et /compte, formulaires auth et sécurité HTTP", () => {
  test("refuse l'accès direct à /admin et /compte sans session (jamais HTTP 200)", async ({
    request,
  }) => {
    for (const path of ["/fr/admin", "/fr/admin/utilisateurs", "/fr/compte"]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).not.toBe(200);
      expect([307, 308, 401, 403, 404]).toContain(response.status());
      const location = response.headers()["location"];
      if (response.status() === 307 || response.status() === 308) {
        expect(location).toMatch(/\/fr\/connexion/);
      }
    }
  });

  test("rend toutes les pages d'authentification sans défaut critique Axe ni débordement à 375 px", async ({
    page,
  }) => {
    for (const path of AUTH_PATHS) {
      await page.setViewportSize({ width: 375, height: 812 });
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);

      const overflowMobile = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflowMobile, `Débordement horizontal mobile sur ${path}`).toBeLessThanOrEqual(0);

      await page.setViewportSize({ width: 1280, height: 800 });
      const axeResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      const serious = axeResults.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(serious, `Violations Axe sur ${path}`).toEqual([]);
    }
  });

  test("rejette CSRF cross-origin (403), corps > 16 Ko (413) et redirection ouverte sur /api/auth", async ({
    request,
  }) => {
    const csrfRes = await request.post("/api/auth/sign-in", {
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
      data: {
        email: "user@example.com",
        password: "Password123456",
        locale: "fr",
      },
    });
    expect(csrfRes.status()).toBe(403);

    const oversized = "a".repeat(20 * 1024);
    const largeRes = await request.post("/api/auth/sign-in", {
      headers: {
        "content-type": "application/json",
      },
      data: {
        email: "user@example.com",
        password: oversized,
        locale: "fr",
      },
    });
    expect(largeRes.status()).toBe(413);

    const openRedirectRes = await request.get(
      "/api/auth/callback?locale=fr&next=https://evil.example/steal",
      { maxRedirects: 0 },
    );
    expect([302, 307]).toContain(openRedirectRes.status());
    const location = openRedirectRes.headers()["location"] ?? "";
    expect(location).not.toContain("evil.example");
  });

  test("rejette les appels non signés ou non configurés sur POST /api/webhooks/email", async ({
    request,
  }) => {
    const res = await request.post("/api/webhooks/email", {
      headers: { "content-type": "application/json" },
      data: { type: "email.bounced" },
    });
    expect([401, 503]).toContain(res.status());
    expect(res.status()).not.toBe(200);
  });

  test("inscrit un nouvel utilisateur, le connecte automatiquement, redirige vers /fr et masque Connexion/S'inscrire", async ({
    page,
  }) => {
    const testEmail = `e2e-signup-${Date.now()}@example.com`;
    const displayName = "Alex E2E";

    await page.goto("/fr/inscription");
    await page.locator("#signup-name").fill(displayName);
    await page.locator("#signup-email").fill(testEmail);
    await page.locator("#signup-password").fill("BonuvoStrong2026!");
    await page.getByRole("button", { name: /Créer mon compte/i }).click();

    await page.waitForURL(/\/fr$/, { timeout: 15000 });
    await expect(page.locator("header").getByRole("link", { name: displayName })).toBeVisible();
    await expect(page.locator("header").getByRole("link", { name: /Connexion/i })).toHaveCount(0);
    await expect(page.locator("header").getByRole("link", { name: /S'inscrire/i })).toHaveCount(0);

    // Persistance de session pendant la navigation
    await page.goto("/fr/offres");
    await expect(page.locator("header").getByRole("link", { name: displayName })).toBeVisible();
    await expect(page.locator("header").getByRole("link", { name: /Connexion/i })).toHaveCount(0);

    await page.goto("/fr/compte");
    await expect(page.getByRole("heading", { name: displayName })).toBeVisible();
    await expect(page.locator("header").getByRole("link", { name: displayName })).toBeVisible();

    // Déconnexion -> réaffichage des boutons Connexion / S'inscrire
    await page.getByRole("button", { name: /Se déconnecter/i }).click();
    await page.waitForURL(/\/fr$/, { timeout: 15000 });
    await expect(page.locator("header").getByRole("link", { name: /Connexion/i })).toBeVisible();
  });
});
