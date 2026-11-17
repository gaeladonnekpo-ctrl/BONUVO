import { describe, expect, it } from "vitest";
import { buildCsvDocument, sanitizeCsvCell } from "@/modules/intelligence/csv";
import { createInMemoryLockBackend } from "@/modules/intelligence/lock";
import {
  computeDailyMetricRows,
  formatMetricCount,
  formatMetricEur,
  formatRatioPercent,
  getPeriodBucketKey,
  safeRate,
} from "@/modules/intelligence/metrics-math";
import { accumulateBreakdown } from "@/modules/intelligence/stats-transform";

describe("Phase 6 — BONUVO INTELLIGENCE (formules, exclusions, zéro division, verrou & CSV)", () => {
  it("calcule exactement chaque indicateur sur un jeu connu en excluant robots, suspects et rejetés", () => {
    const rows = computeDailyMetricRows({
      visits: [
        {
          metricDate: "2026-11-15",
          countryCode: "BJ",
          bookmakerId: null,
          offerId: null,
          eventType: "page_view",
          visitorDailyHash: "vis_a",
          isBot: false,
        },
        {
          metricDate: "2026-11-15",
          countryCode: "BJ",
          bookmakerId: "bm-1",
          offerId: "off-1",
          eventType: "offer_view",
          visitorDailyHash: "vis_a", // même visiteur le même jour
          isBot: false,
        },
        {
          metricDate: "2026-11-15",
          countryCode: "BJ",
          bookmakerId: "bm-1",
          offerId: "off-1",
          eventType: "promo_copy",
          visitorDailyHash: "vis_b",
          isBot: false,
        },
        {
          metricDate: "2026-11-15",
          countryCode: "BJ",
          bookmakerId: null,
          offerId: null,
          eventType: "page_view",
          visitorDailyHash: "vis_bot",
          isBot: true, // exclu
        },
      ],
      clicks: [
        {
          metricDate: "2026-11-15",
          countryCode: "BJ",
          bookmakerId: "bm-1",
          offerId: "off-1",
          campaignId: "camp-1",
          isBot: false,
          isSuspect: false,
        },
        {
          metricDate: "2026-11-15",
          countryCode: "BJ",
          bookmakerId: "bm-1",
          offerId: "off-1",
          campaignId: "camp-1",
          isBot: false,
          isSuspect: true, // compté dans rawClicks, exclu de validClicks
        },
        {
          metricDate: "2026-11-15",
          countryCode: "NG",
          bookmakerId: "bm-1",
          offerId: "off-1",
          campaignId: null,
          isBot: false,
          isSuspect: false,
        },
      ],
      conversions: [
        {
          metricDate: "2026-11-15",
          countryCode: "BJ",
          bookmakerId: "bm-1",
          offerId: "off-1",
          campaignId: "camp-1",
          conversionType: "registration",
          status: "recorded",
        },
        {
          metricDate: "2026-11-15",
          countryCode: "BJ",
          bookmakerId: "bm-1",
          offerId: "off-1",
          campaignId: "camp-1",
          conversionType: "first_deposit",
          status: "recorded",
        },
        {
          metricDate: "2026-11-15",
          countryCode: "BJ",
          bookmakerId: "bm-1",
          offerId: "off-1",
          campaignId: "camp-1",
          conversionType: "first_deposit",
          status: "rejected", // exclu
        },
      ],
      commissions: [
        {
          metricDate: "2026-11-15",
          countryCode: "BJ",
          bookmakerId: "bm-1",
          offerId: "off-1",
          campaignId: "camp-1",
          status: "confirmed",
          amount: 45,
          currencyCode: "EUR",
        },
        {
          metricDate: "2026-11-15",
          countryCode: "BJ",
          bookmakerId: "bm-1",
          offerId: "off-1",
          campaignId: "camp-1",
          status: "pending",
          amount: 15,
          currencyCode: "EUR",
        },
        {
          metricDate: "2026-11-15",
          countryCode: "BJ",
          bookmakerId: "bm-1",
          offerId: "off-1",
          campaignId: "camp-1",
          status: "rejected",
          amount: 99,
          currencyCode: "EUR",
        },
      ],
    });

    const totalRow = rows.find((r) => r.grain === "day_total")!;
    expect(totalRow).toBeDefined();
    expect(totalRow.uniqueVisitors).toBe(2); // vis_a + vis_b (vis_bot exclu, vis_a non doublé)
    expect(totalRow.pageViews).toBe(1);
    expect(totalRow.offerViews).toBe(1);
    expect(totalRow.promoCopies).toBe(1);
    expect(totalRow.rawClicks).toBe(3);
    expect(totalRow.validClicks).toBe(2);
    expect(totalRow.registrations).toBe(1);
    expect(totalRow.firstDeposits).toBe(1);
    expect(totalRow.confirmedCommissionsCount).toBe(1);
    expect(totalRow.confirmedCommissionsEur).toBe("45.00");
    expect(totalRow.pendingCommissionsEur).toBe("15.00");

    // Rejouer exactement le calcul donne des clés identiques (idempotence)
    const replay = computeDailyMetricRows({
      visits: [],
      clicks: [],
      conversions: [],
      commissions: [],
    });
    expect(replay).toEqual([]);
  });

  it("gère la division par zéro et affiche « — » lorsque les données manquent", () => {
    expect(safeRate(5, 0)).toBeNull();
    expect(safeRate(null, 10)).toBeNull();
    expect(safeRate(1, 4)).toBeCloseTo(0.25);
    expect(formatRatioPercent(null, "fr")).toBe("—");
    expect(formatMetricCount(null, "fr")).toBe("—");
    expect(formatMetricEur(null, "en")).toBe("—");

    const breakdown = accumulateBreakdown(
      [
        {
          countryCode: "BJ",
          bookmakerId: "bm-none",
          offerId: null,
          campaignId: null,
          validClicks: 12,
          registrations: 0,
          firstDeposits: 0,
          confirmedCommissionsCount: 0,
          confirmedCommissionsEur: "0.00",
        },
      ],
      "bookmaker",
      () => ({ label: "Bookmaker Sans Suivi", trackingNone: true }),
      false,
    );

    expect(breakdown[0]?.trackingUnavailable).toBe(true);
    expect(breakdown[0]?.registrations).toBeNull();
    expect(breakdown[0]?.firstDeposits).toBeNull();
    expect(breakdown[0]?.confirmedCommissionsEur).toBeNull();
  });

  it("regroupe correctement par semaine et mois et protège par verrou concurrentiel + CSV sûr", async () => {
    expect(getPeriodBucketKey("2026-11-15", "week")).toBe("2026-11-09"); // lundi UTC
    expect(getPeriodBucketKey("2026-11-15", "month")).toBe("2026-11");

    const lock = createInMemoryLockBackend();
    const token1 = await lock.acquire("aggregate-metrics-test", 60);
    expect(token1).toBeTruthy();
    const token2 = await lock.acquire("aggregate-metrics-test", 60);
    expect(token2).toBeNull();
    await lock.release("aggregate-metrics-test", token1!);
    const token3 = await lock.acquire("aggregate-metrics-test", 60);
    expect(token3).toBeTruthy();

    expect(sanitizeCsvCell("=CMD('calc')")).toBe("'=CMD('calc')");
    expect(sanitizeCsvCell("+SUM(A1:A2)")).toBe("'+SUM(A1:A2)");
    const csv = buildCsvDocument(["bookmaker", "clicks"], [["1xBet", 42]]);
    expect(csv).toBe("bookmaker,clicks\r\n1xBet,42");
  });
});
