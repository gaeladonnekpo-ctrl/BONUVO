import type { DailyMetricRowLike } from "@/modules/intelligence/stats-transform";

export const REFERENCE_DEMO_TOTALS = {
  uniqueVisitors: 1500,
  validClicks: 998,
  registrations: 900,
  firstDeposits: 851,
  promoCopies: 1200,
  pageViews: 3600,
  offerViews: 1450,
  rawClicks: 1080,
} as const;

// Deterministic realistic daily wave weights (peaks on matchdays, dips midweek)
const DAILY_WEIGHTS = [
  0.82, 0.76, 0.91, 1.05, 1.24, 1.38, 1.18, 0.79, 0.74, 0.88, 1.02, 1.29, 1.42, 1.15, 0.85,
];

function enumerateDays(fromDate: string, toDate: string): string[] {
  const startMs = Date.parse(`${fromDate}T00:00:00.000Z`);
  const endMs = Date.parse(`${toDate}T00:00:00.000Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return [toDate];
  }
  const days: string[] = [];
  const dayMs = 24 * 3600_000;
  for (let t = startMs; t <= endMs && days.length < 60; t += dayMs) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days.length > 0 ? days : [toDate];
}

/**
 * Distributes an integer total across N days using largest-remainder rounding
 * so the sum of all daily buckets is guaranteed to equal `total` exactly.
 */
function distributeIntegerTotal(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const wSum = weights.reduce((a, b) => a + b, 0) || 1;
  const exact = weights.map((w) => (total * w) / wSum);
  const floors = exact.map((v) => Math.floor(v));
  let remainder = total - floors.reduce((a, b) => a + b, 0);

  const ranked = exact
    .map((v, idx) => ({ idx, frac: v - floors[idx]! }))
    .sort((a, b) => b.frac - a.frac);

  for (let i = 0; i < ranked.length && remainder > 0; i += 1) {
    floors[ranked[i]!.idx]! += 1;
    remainder -= 1;
  }
  return floors;
}

/**
 * Generates deterministic, realistic daily reference rows whose exact sum across [fromDate, toDate]
 * matches the BONUVO partner presentation benchmark (1500 visitors, 998 clicks, 900 registrations,
 * 851 FTDs, 1200 promo copies).
 */
export function buildReferenceDailyRows(
  fromDate: string,
  toDate: string,
  countryCode = "ALL",
): DailyMetricRowLike[] {
  const days = enumerateDays(fromDate, toDate);
  const weights = days.map((_, idx) => DAILY_WEIGHTS[idx % DAILY_WEIGHTS.length]!);

  const visitorsArr = distributeIntegerTotal(REFERENCE_DEMO_TOTALS.uniqueVisitors, weights);
  const clicksArr = distributeIntegerTotal(REFERENCE_DEMO_TOTALS.validClicks, weights);
  const regsArr = distributeIntegerTotal(REFERENCE_DEMO_TOTALS.registrations, weights);
  const ftdsArr = distributeIntegerTotal(REFERENCE_DEMO_TOTALS.firstDeposits, weights);
  const promosArr = distributeIntegerTotal(REFERENCE_DEMO_TOTALS.promoCopies, weights);
  const pagesArr = distributeIntegerTotal(REFERENCE_DEMO_TOTALS.pageViews, weights);
  const offersArr = distributeIntegerTotal(REFERENCE_DEMO_TOTALS.offerViews, weights);
  const rawClicksArr = distributeIntegerTotal(REFERENCE_DEMO_TOTALS.rawClicks, weights);

  return days.map((metricDate, i) => ({
    metricDate,
    countryCode,
    bookmakerId: null,
    offerId: null,
    campaignId: null,
    uniqueVisitors: visitorsArr[i] ?? 0,
    pageViews: pagesArr[i] ?? 0,
    offerViews: offersArr[i] ?? 0,
    promoCopies: promosArr[i] ?? 0,
    rawClicks: rawClicksArr[i] ?? 0,
    validClicks: clicksArr[i] ?? 0,
    registrations: regsArr[i] ?? 0,
    firstDeposits: ftdsArr[i] ?? 0,
    qualifiedConversions: ftdsArr[i] ?? 0,
    confirmedCommissionsCount: 0,
    confirmedCommissionsEur: "0.00",
    pendingCommissionsEur: "0.00",
  }));
}

export function sumMetricTotals(rows: readonly DailyMetricRowLike[]) {
  return rows.reduce(
    (acc, r) => {
      acc.uniqueVisitors += r.uniqueVisitors;
      acc.validClicks += r.validClicks;
      acc.registrations += r.registrations;
      acc.firstDeposits += r.firstDeposits;
      acc.promoCopies += r.promoCopies;
      return acc;
    },
    {
      uniqueVisitors: 0,
      validClicks: 0,
      registrations: 0,
      firstDeposits: 0,
      promoCopies: 0,
    },
  );
}

/**
 * Blends real DB daily rows with simulated reference rows by metricDate
 * without mutating any persisted database records.
 */
export function mergeRealAndReferenceRows(
  realRows: readonly DailyMetricRowLike[],
  refRows: readonly DailyMetricRowLike[],
): DailyMetricRowLike[] {
  const byDate = new Map<string, DailyMetricRowLike>();

  for (const r of realRows) {
    const cur = byDate.get(r.metricDate);
    if (!cur) {
      byDate.set(r.metricDate, { ...r });
    } else {
      cur.uniqueVisitors += r.uniqueVisitors;
      cur.pageViews += r.pageViews;
      cur.offerViews += r.offerViews;
      cur.promoCopies += r.promoCopies;
      cur.rawClicks += r.rawClicks;
      cur.validClicks += r.validClicks;
      cur.registrations += r.registrations;
      cur.firstDeposits += r.firstDeposits;
      cur.qualifiedConversions += r.qualifiedConversions;
      cur.confirmedCommissionsCount += r.confirmedCommissionsCount;
      cur.confirmedCommissionsEur = (
        Number(cur.confirmedCommissionsEur) + Number(r.confirmedCommissionsEur)
      ).toFixed(2);
      cur.pendingCommissionsEur = (
        Number(cur.pendingCommissionsEur) + Number(r.pendingCommissionsEur)
      ).toFixed(2);
    }
  }

  for (const ref of refRows) {
    const cur = byDate.get(ref.metricDate);
    if (!cur) {
      byDate.set(ref.metricDate, { ...ref });
    } else {
      cur.uniqueVisitors += ref.uniqueVisitors;
      cur.pageViews += ref.pageViews;
      cur.offerViews += ref.offerViews;
      cur.promoCopies += ref.promoCopies;
      cur.rawClicks += ref.rawClicks;
      cur.validClicks += ref.validClicks;
      cur.registrations += ref.registrations;
      cur.firstDeposits += ref.firstDeposits;
      cur.qualifiedConversions += ref.qualifiedConversions;
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.metricDate.localeCompare(b.metricDate));
}
