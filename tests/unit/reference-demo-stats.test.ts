import { describe, expect, it } from "vitest";
import {
  buildReferenceDailyRows,
  mergeRealAndReferenceRows,
  REFERENCE_DEMO_TOTALS,
  sumMetricTotals,
} from "@/modules/intelligence/reference-demo";
import {
  buildKpisAndFunnel,
  buildTimeSeries,
  computeDailyEvolution,
  type DailyMetricRowLike,
} from "@/modules/intelligence/stats-transform";

describe("Admin Reference Demo Dataset & Acquisition Funnel", () => {
  it("distributes exact reference benchmark totals across the selected date window", () => {
    const rows = buildReferenceDailyRows("2026-11-01", "2026-11-30", "ALL");
    expect(rows).toHaveLength(30);

    const totals = sumMetricTotals(rows);
    expect(totals.uniqueVisitors).toBe(1500);
    expect(totals.validClicks).toBe(998);
    expect(totals.registrations).toBe(900);
    expect(totals.firstDeposits).toBe(851);
    expect(totals.promoCopies).toBe(1200);
  });

  it("blends real collected rows with reference rows and auto-computes funnel conversion rates", () => {
    const refRows = buildReferenceDailyRows("2026-11-20", "2026-11-26", "ALL");
    const realRows: DailyMetricRowLike[] = [
      {
        metricDate: "2026-11-25",
        countryCode: "ALL",
        bookmakerId: null,
        offerId: null,
        campaignId: null,
        uniqueVisitors: 100,
        pageViews: 240,
        offerViews: 80,
        promoCopies: 50,
        rawClicks: 60,
        validClicks: 52,
        registrations: 20,
        firstDeposits: 9,
        qualifiedConversions: 9,
        confirmedCommissionsCount: 2,
        confirmedCommissionsEur: "120.00",
        pendingCommissionsEur: "0.00",
      },
    ];

    const blended = mergeRealAndReferenceRows(realRows, refRows);
    const totalVisitors = 100 + REFERENCE_DEMO_TOTALS.uniqueVisitors;

    const { kpis, funnel } = buildKpisAndFunnel({
      rows: blended,
      uniqueVisitors: totalVisitors,
      hasAnyMetrics: true,
      hideFinancials: false,
    });

    expect(kpis.uniqueVisitors).toBe(1600);
    expect(kpis.validClicks).toBe(1050);
    expect(kpis.registrations).toBe(920);
    expect(kpis.firstDeposits).toBe(860);
    expect(kpis.promoCopies).toBe(1250);

    // Automatically computed rates (no hardcoded percentages)
    expect(kpis.ctrRate).toBeCloseTo(1050 / 1600, 6);
    expect(kpis.clickToRegRate).toBeCloseTo(920 / 1050, 6);
    expect(kpis.regToFtdRate).toBeCloseTo(860 / 920, 6);
    expect(kpis.clickToFtdRate).toBeCloseTo(860 / 1050, 6);

    expect(funnel.find((s) => s.step === "clicks")?.stepRate).toBeCloseTo(1050 / 1600, 6);
    expect(funnel.find((s) => s.step === "registrations")?.stepRate).toBeCloseTo(920 / 1050, 6);
    expect(funnel.find((s) => s.step === "first_deposits")?.stepRate).toBeCloseTo(860 / 920, 6);
  });

  it("computes daily absolute and percentage variations with upward/downward trends", () => {
    const refRows = buildReferenceDailyRows("2026-11-20", "2026-11-26", "ALL");
    const ts = buildTimeSeries(refRows, "day", false);
    const evo = computeDailyEvolution(ts);

    expect(evo.latestPeriod).toBe("2026-11-26");
    expect(evo.previousPeriod).toBe("2026-11-25");

    const last = ts[ts.length - 1]!;
    const prev = ts[ts.length - 2]!;
    expect(evo.visitors.deltaAbs).toBe(last.uniqueVisitors - prev.uniqueVisitors);
    expect(evo.validClicks.deltaAbs).toBe(last.validClicks - prev.validClicks);
    expect(evo.registrations.deltaAbs).toBe(last.registrations - prev.registrations);
    expect(evo.firstDeposits.deltaAbs).toBe(last.firstDeposits - prev.firstDeposits);
    expect(["up", "down", "flat"]).toContain(evo.visitors.trend);
  });
});
