import { expect, test } from "@playwright/test";

test.describe("Phase 0 — Smoke tests", () => {
  test("la page d'accueil provisoire répond 200 et affiche le nom et la signature", async ({
    page,
  }) => {
    const response = await page.goto("/fr");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "BONUVO" })).toBeVisible();
    await expect(page.getByText("BONUVO: SMART OFFERS. BETTER CHOICES.")).toBeVisible();
  });

  test("la racine / redirige vers /fr avec un rendu 200 pour la locale fr", async ({ browser }) => {
    const context = await browser.newContext({ locale: "fr-FR" });
    const page = await context.newPage();
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/fr$/);
    await context.close();
  });

  test("la route /api/health répond sans exposer de données sensibles", async ({ request }) => {
    const response = await request.get("/api/health");
    expect([200, 503]).toContain(response.status());

    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload.app).toBe("ok");
    expect(["ok", "degraded"]).toContain(payload.status);
    expect(["ok", "unavailable"]).toContain(payload.database);
    expect(JSON.stringify(payload)).not.toMatch(/postgres(ql)?:\/\//i);
  });
});
