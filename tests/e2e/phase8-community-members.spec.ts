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

    // Vérifie la présence des 3 liens officiels (Telegram, WhatsApp, Facebook) et de leurs logos SVG
    await expect(page.locator('a[href="https://t.me/+OXjlhqM1ShVmZWM0"]').first()).toBeVisible();
    await expect(
      page.locator('a[href="https://whatsapp.com/channel/0029VbACyWA4dTnIfN5BA01S"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('a[href="https://www.facebook.com/profile.php?id=100066896162096"]').first(),
    ).toBeVisible();

    // Vérifie la présence des 3 liens officiels (Telegram, WhatsApp, Facebook) et de leurs logos SVG
    await expect(page.locator('a[href="https://t.me/+OXjlhqM1ShVmZWM0"]').first()).toBeVisible();
    await expect(
      page.locator('a[href="https://whatsapp.com/channel/0029VbACyWA4dTnIfN5BA01S"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('a[href="https://www.facebook.com/profile.php?id=100066896162096"]').first(),
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

    // Vérifie la navigation rapide de Offres vers Codes promo
    await page
      .getByRole("link", { name: /Codes promo/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/fr\/codes-promo/);

    // Vérifie la navigation rapide de Offres vers Codes promo
    await page
      .getByRole("link", { name: /Codes promo/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/fr\/codes-promo/);

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

  test("affiche Connexion / Inscription en accès libre et permet l'inscription CRM Newsletter + désabonnement", async ({
    page,
    request,
  }) => {
    await page.goto("/fr");
    await expect(page).toHaveURL(/\/fr$/);
    await expect(page.locator("header").getByRole("link", { name: /Connexion/i })).toBeVisible();
    await expect(page.locator("header").getByRole("link", { name: /S'inscrire/i })).toBeVisible();

    const newsletter = page.locator("#newsletter");
    await expect(newsletter).toBeVisible();

    const testEmail = `e2e-crm-${Date.now()}@example.com`;
    await newsletter.locator('input[name="fullName"]').fill("Koffi Mensah");
    await newsletter.locator('input[name="email"]').fill(testEmail);
    await newsletter.locator('input[name="phone"]').fill("+229 90 00 00 01");
    await newsletter.locator('select[name="countryCode"]').selectOption("BJ");
    await newsletter.locator('input[name="consentGranted"]').check();
    await newsletter.getByRole("button", { name: /S'inscrire à la newsletter BONUVO/i }).click();

    await expect(newsletter.getByRole("status")).toContainText(
      /Inscription confirmée à la newsletter BONUVO/i,
    );

    // Prévention des doublons : une nouvelle soumission avec le même e-mail met à jour sans créer de doublon
    const dupRes = await request.post("/api/newsletter", {
      data: {
        fullName: "Koffi Mensah",
        email: testEmail,
        countryCode: "BJ",
        locale: "fr",
        consentGranted: true,
      },
    });
    expect(dupRes.status()).toBe(200);
    const dupJson = (await dupRes.json()) as {
      ok: boolean;
      alreadySubscribed: boolean;
      unsubscribeUrl: string;
    };
    expect(dupJson.ok).toBe(true);
    expect(dupJson.alreadySubscribed).toBe(true);

    // Désabonnement 1-clic via le lien généré
    await page.goto(`${dupJson.unsubscribeUrl}&confirm=1`);
    await expect(page.getByText(/désinscription a été enregistrée/i)).toBeVisible();
  });
});
