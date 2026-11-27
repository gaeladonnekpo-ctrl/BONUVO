import { describe, expect, it } from "vitest";
import { buildCountryKpiBreakdown } from "@/modules/intelligence/stats-transform";
import type { DailyMetricRowLike } from "@/modules/intelligence/stats-transform";

function makeRow(overrides: Partial<DailyMetricRowLike>): DailyMetricRowLike {
  return {
    metricDate: "2026-11-27",
    countryCode: "BJ",
    bookmakerId: null,
    offerId: null,
    campaignId: null,
    uniqueVisitors: 0,
    pageViews: 0,
    offerViews: 0,
    promoCopies: 0,
    rawClicks: 0,
    validClicks: 0,
    registrations: 0,
    firstDeposits: 0,
    qualifiedConversions: 0,
    confirmedCommissionsCount: 0,
    confirmedCommissionsEur: "0.00",
    pendingCommissionsEur: "0.00",
    ...overrides,
  };
}

describe("Admin Statistics — Per-country KPI breakdown", () => {
  it("distributes every indicator across all available active countries including zero-activity ones", () => {
    const countries = [
      { code: "BJ", nameFr: "Bénin" },
      { code: "CI", nameFr: "Côte d'Ivoire" },
      { code: "SN", nameFr: "Sénégal" },
    ];
    const rows = [
      makeRow({
        countryCode: "BJ",
        uniqueVisitors: 120,
        pageViews: 340,
        offerViews: 90,
        promoCopies: 24,
        validClicks: 60,
        registrations: 12,
        firstDeposits: 6,
        confirmedCommissionsCount: 6,
        confirmedCommissionsEur: "180.00",
      }),
      makeRow({
        countryCode: "CI",
        uniqueVisitors: 80,
        pageViews: 200,
        offerViews: 40,
        promoCopies: 10,
        validClicks: 20,
        registrations: 4,
        firstDeposits: 2,
        confirmedCommissionsCount: 2,
        confirmedCommissionsEur: "50.00",
      }),
    ];

    const result = buildCountryKpiBreakdown({
      countries,
      rows,
      useDetailGrain: false,
      hasAnyMetrics: true,
      hideFinancials: false,
    });

    expect(result).toHaveLength(3);
    expect(result[0]?.countryCode).toBe("BJ");
    expect(result[0]?.uniqueVisitors).toBe(120);
    expect(result[0]?.validClicks).toBe(60);
    expect(result[0]?.registrations).toBe(12);
    expect(result[0]?.firstDeposits).toBe(6);
    expect(result[0]?.confirmedCommissionsEur).toBe(180);
    expect(result[0]?.promoCopies).toBe(24);
    expect(result[0]?.ctrRate).toBeCloseTo(0.5);
    expect(result[0]?.epcEur).toBeCloseTo(3);

    expect(result[1]?.countryCode).toBe("CI");
    expect(result[1]?.confirmedCommissionsEur).toBe(50);

    // Senegal is active with 0 activity yet and still appears
    expect(result[2]?.countryCode).toBe("SN");
    expect(result[2]?.uniqueVisitors).toBe(0);
    expect(result[2]?.validClicks).toBe(0);
    expect(result[2]?.promoCopies).toBe(0);
  });

  it("hides financial metrics when hideFinancials is true", () => {
    const result = buildCountryKpiBreakdown({
      countries: [{ code: "BJ", nameFr: "Bénin" }],
      rows: [
        makeRow({
          countryCode: "BJ",
          uniqueVisitors: 50,
          validClicks: 10,
          confirmedCommissionsCount: 2,
          confirmedCommissionsEur: "40.00",
        }),
      ],
      useDetailGrain: false,
      hasAnyMetrics: true,
      hideFinancials: true,
    });

    expect(result[0]?.confirmedCommissionsCount).toBeNull();
    expect(result[0]?.confirmedCommissionsEur).toBeNull();
    expect(result[0]?.epcEur).toBeNull();
  });
});
