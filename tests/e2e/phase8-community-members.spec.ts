import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Phase 8 — BONUVO COMMUNITY & Espace MEMBERS", () => {
  test("les pages publiques /fr/communaute, /en/communaute et /fr/desinscription répondent 200 OK et respectent WCAG 2.1 AA", async ({
    page,
  }) => {
    const resFr = await page.goto("/fr/communaute");
    expect(resFr?.status()).toBe(200);
    await expect(
      page.getByRole("heading", {
        name: /Canaux officiels, coupons validés/i,
      }),
    ).toBeVisible();

    const axeCommunity = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const seriousCommunity = axeCommunity.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(seriousCommunity).toEqual([]);

    const resEn = await page.goto("/en/communaute");
    expect(resEn?.status()).toBe(200);
    await expect(
      page.getByRole("heading", {
        name: /Official channels, validated coupons/i,
      }),
    ).toBeVisible();

    const resUnsub = await page.goto("/fr/desinscription");
    expect(resUnsub?.status()).toBe(200);
    await expect(
      page.getByRole("heading", {
        name: /Désinscription des communications BONUVO/i,
      }),
    ).toBeVisible();

    const axeUnsub = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const seriousUnsub = axeUnsub.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(seriousUnsub).toEqual([]);
  });

  test("les offres publiques restent accessibles sans compte et les routes protégées / API rejettent les accès non autorisés", async ({
    page,
    request,
  }) => {
    const offersRes = await page.goto("/fr/offres");
    expect(offersRes?.status()).toBe(200);

    // Unsubscribe API rejette un jeton forgé
    const forgedUnsub = await request.post("/api/unsubscribe", {
      data: { token: "eyJ1c2VySWQiOiJmb3JnZWQifQ.invalidsignature" },
    });
    expect(forgedUnsub.status()).toBe(400);

    // Export JSON personnel exige une session authentifiée
    const exportRes = await request.get("/api/account/export");
    expect(exportRes.status()).toBe(401);

    // Cron purge-data et Webhook Telegram rejettent les requêtes sans secret valide
    const purgeRes = await request.post("/api/cron/purge-data", {
      headers: { "x-cron-secret": "wrong-cron-token" },
      data: {},
    });
    expect([401, 503]).toContain(purgeRes.status());

    const tgWebhookRes = await request.post("/api/webhooks/telegram", {
      headers: { "x-telegram-bot-api-secret-token": "wrong-secret" },
      data: { update_id: 1 },
    });
    expect(tgWebhookRes.status()).toBe(401);

    // Les pages d'administration Phase 8 redirigent vers /fr/connexion sans session
    await page.goto("/fr/admin/communaute");
    await expect(page).toHaveURL(/\/fr\/connexion/);

    await page.goto("/fr/admin/contenus");
    await expect(page).toHaveURL(/\/fr\/connexion/);

    await page.goto("/fr/admin/notifications");
    await expect(page).toHaveURL(/\/fr\/connexion/);
  });
});
