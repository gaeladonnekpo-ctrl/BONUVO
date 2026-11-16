import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { filterAndRankOffers, resolveOfferBadges } from "@/modules/offers/public-mappers";
import { goRedirectSlugSchema, publicEventInputSchema } from "@/modules/offers/public-schema";
import type { PublicOfferListItem } from "@/modules/offers/public-types";
import { detectVisitorCountryCode } from "@/server/geo/country-resolve";
import { inspectVisitorRequest } from "@/server/tracking/bot-detect";
import { buildPartnerRedirectUrl } from "@/server/tracking/redirect-builder";

function makeSampleOffer(overrides: Partial<PublicOfferListItem>): PublicOfferListItem {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    offerSlug: "offer-a",
    offerType: "welcome",
    bookmakerId: "00000000-0000-4000-8000-000000000010",
    bookmakerSlug: "bookmaker-a",
    bookmakerName: "Bookmaker Test A",
    bookmakerShortName: "BTA",
    bookmakerLogoUrl: null,
    bonusHeadline: "100% jusqu'à 50 000 XOF",
    bonusAmountDisplay: "50 000 XOF",
    bonusAmountNumber: 50000,
    bonusPercentage: 100,
    minDepositNumber: 1000,
    minOddsNumber: 1.5,
    currencyCode: "XOF",
    ratingScore: 8.5,
    ratingMax: 10,
    badges: ["recommended"],
    highlights: ["Mobile Money rapide"],
    paymentMethods: ["MTN MoMo"],
    paymentMethodSlugs: ["mtn-momo"],
    promoCode: "TESTA",
    promoCodeId: null,
    ctaHref: "/go/test-a",
    lastVerifiedIso: "2026-11-16T10:00:00.000Z",
    updatedAtIso: "2026-11-16T10:00:00.000Z",
    effectiveRank: 10,
    eligibleCountryCodes: ["BJ"],
    ...overrides,
  };
}

describe("Phase 4 — Logique catalogue public, géolocalisation, bots et redirection B2", () => {
  it("buildPartnerRedirectUrl autorise uniquement HTTPS sur allowedHosts et injecte subid", () => {
    const ok = buildPartnerRedirectUrl({
      destinationUrl: "https://sub.partner.bj/signup?tag=1",
      allowedHosts: ["partner.bj"],
      subIdParamName: "click_id",
      publicClickId: "clk_abc123",
    });
    expect(ok.valid).toBe(true);
    expect(ok.url).toBe("https://sub.partner.bj/signup?tag=1&click_id=clk_abc123");

    const httpBlocked = buildPartnerRedirectUrl({
      destinationUrl: "http://partner.bj/signup",
      allowedHosts: ["partner.bj"],
      publicClickId: "clk_abc123",
    });
    expect(httpBlocked.valid).toBe(false);

    const foreignHost = buildPartnerRedirectUrl({
      destinationUrl: "https://evil.example/phish",
      allowedHosts: ["partner.bj"],
      publicClickId: "clk_abc123",
    });
    expect(foreignHost.valid).toBe(false);
  });

  it("detectVisitorCountryCode respecte query > cookie > en-tête > GLOBAL et ignore XX", () => {
    expect(
      detectVisitorCountryCode({
        queryCountry: "bj",
        cookieCountry: "FR",
        headerCountry: "CI",
      }),
    ).toEqual({ code: "BJ", source: "query" });

    expect(
      detectVisitorCountryCode({
        queryCountry: null,
        cookieCountry: "ci",
        headerCountry: "FR",
      }),
    ).toEqual({ code: "CI", source: "cookie" });

    expect(
      detectVisitorCountryCode({
        headerCountry: "XX",
      }),
    ).toEqual({ code: "GLOBAL", source: "default" });

    expect(
      detectVisitorCountryCode({
        headerCountry: "sn",
      }),
    ).toEqual({ code: "SN", source: "header" });
  });

  it("inspectVisitorRequest marque les robots et protège l'IP via hachage journalier", () => {
    const botHeaders = new Headers({
      "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
      referer: "https://example.com/some/path?secret=1",
    });
    const botFp = inspectVisitorRequest({
      headers: botHeaders,
      ip: "203.0.113.45",
      secret: "unit-test-secret-minimum-32-chars!!",
    });
    expect(botFp.isBot).toBe(true);
    expect(botFp.deviceType).toBe("bot");
    expect(botFp.referrerHost).toBe("example.com");
    expect(botFp.visitorDailyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(botFp.visitorDailyHash).not.toContain("203.0.113.45");

    const mobileHeaders = new Headers({
      "user-agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    });
    const mobileFp = inspectVisitorRequest({
      headers: mobileHeaders,
      ip: "203.0.113.45",
      secret: "unit-test-secret-minimum-32-chars!!",
    });
    expect(mobileFp.isBot).toBe(false);
    expect(mobileFp.deviceType).toBe("mobile");
  });

  it("resolveOfferBadges expire le badge Nouveau après 30 jours et vérifie aujourd'hui uniquement le jour même", () => {
    const now = new Date("2026-11-16T15:00:00.000Z");
    const oldCreated = new Date("2026-09-01T10:00:00.000Z");
    const todayVerified = new Date("2026-11-16T08:00:00.000Z");
    const yesterdayVerified = new Date("2026-11-15T22:00:00.000Z");

    expect(
      resolveOfferBadges({
        badgeCode: "new",
        createdAt: oldCreated,
        lastVerifiedAt: todayVerified,
        now,
      }),
    ).toEqual(["verified"]);

    expect(
      resolveOfferBadges({
        badgeCode: "new",
        createdAt: new Date("2026-11-10T10:00:00.000Z"),
        lastVerifiedAt: yesterdayVerified,
        now,
      }),
    ).toEqual(["new"]);
  });

  it("filterAndRankOffers filtre et trie exactement selon les critères demandés", () => {
    const a = makeSampleOffer({
      id: "1",
      offerSlug: "offer-a",
      bonusAmountNumber: 50000,
      ratingScore: 8.5,
      effectiveRank: 2,
      minDepositNumber: 1000,
      promoCode: "CODEA",
    });
    const b = makeSampleOffer({
      id: "2",
      offerSlug: "offer-b",
      offerType: "cashback",
      bookmakerSlug: "bookmaker-b",
      bookmakerName: "Bookmaker Test B",
      bonusAmountNumber: 120000,
      ratingScore: 9.2,
      effectiveRank: 1,
      minDepositNumber: 5000,
      promoCode: undefined,
      paymentMethodSlugs: ["wave"],
    });

    expect(filterAndRankOffers([a, b], { avecCode: true }).map((i) => i.offerSlug)).toEqual([
      "offer-a",
    ]);
    expect(filterAndRankOffers([a, b], { depotMax: 2000 }).map((i) => i.offerSlug)).toEqual([
      "offer-a",
    ]);
    expect(filterAndRankOffers([a, b], { tri: "bonus" }).map((i) => i.offerSlug)).toEqual([
      "offer-b",
      "offer-a",
    ]);
  });

  it("rejette les chemins invalides dans POST /api/events et slugs malformés", () => {
    expect(
      publicEventInputSchema.safeParse({ eventType: "page_view", path: "//evil.com" }).success,
    ).toBe(false);
    expect(
      publicEventInputSchema.safeParse({ eventType: "promo_copy", path: "/fr/offres" }).success,
    ).toBe(true);
    expect(goRedirectSlugSchema.safeParse("../admin").success).toBe(false);
  });
});
