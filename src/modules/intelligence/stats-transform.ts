import { getPeriodBucketKey, safeRate } from "@/modules/intelligence/metrics-math";
import type { DrillDimension, MetricGroupBy } from "@/modules/intelligence/schema";
import type {
  BreakdownRow,
  CountryKpiBreakdownRow,
  DailyEvolutionSummary,
  FunnelStageItem,
  IntelligenceKpis,
  MetricDeltaSummary,
  TimeSeriesPoint,
} from "@/modules/intelligence/stats-types";

export interface BreakdownSourceRow {
  countryCode: string;
  bookmakerId: string | null;
  offerId: string | null;
  campaignId: string | null;
  validClicks: number;
  registrations: number;
  firstDeposits: number;
  confirmedCommissionsCount: number;
  confirmedCommissionsEur: string;
}

export interface DailyMetricRowLike extends BreakdownSourceRow {
  metricDate: string;
  uniqueVisitors: number;
  pageViews: number;
  offerViews: number;
  promoCopies: number;
  rawClicks: number;
  qualifiedConversions: number;
  pendingCommissionsEur: string;
}

export function buildKpisAndFunnel(params: {
  rows: readonly DailyMetricRowLike[];
  uniqueVisitors: number | null;
  hasAnyMetrics: boolean;
  hideFinancials: boolean;
}): { kpis: IntelligenceKpis; funnel: FunnelStageItem[] } {
  const { rows, uniqueVisitors, hasAnyMetrics, hideFinancials } = params;
  const totals = rows.reduce(
    (acc, r) => {
      acc.pageViews += r.pageViews;
      acc.offerViews += r.offerViews;
      acc.promoCopies += r.promoCopies;
      acc.rawClicks += r.rawClicks;
      acc.validClicks += r.validClicks;
      acc.registrations += r.registrations;
      acc.firstDeposits += r.firstDeposits;
      acc.qualified += r.qualifiedConversions;
      acc.commCount += r.confirmedCommissionsCount;
      acc.commEur += Number(r.confirmedCommissionsEur);
      acc.pendingEur += Number(r.pendingCommissionsEur);
      return acc;
    },
    {
      pageViews: 0,
      offerViews: 0,
      promoCopies: 0,
      rawClicks: 0,
      validClicks: 0,
      registrations: 0,
      firstDeposits: 0,
      qualified: 0,
      commCount: 0,
      commEur: 0,
      pendingEur: 0,
    },
  );

  const clicksValue = hasAnyMetrics ? totals.validClicks : null;
  const regsValue = hasAnyMetrics ? totals.registrations : null;
  const ftdValue = hasAnyMetrics ? totals.firstDeposits : null;
  const commCountValue = !hasAnyMetrics || hideFinancials ? null : totals.commCount;
  const commEurValue = !hasAnyMetrics || hideFinancials ? null : totals.commEur;

  return {
    kpis: {
      uniqueVisitors,
      pageViews: totals.pageViews,
      offerViews: totals.offerViews,
      promoCopies: totals.promoCopies,
      rawClicks: totals.rawClicks,
      validClicks: totals.validClicks,
      registrations: regsValue,
      firstDeposits: ftdValue,
      qualifiedConversions: hasAnyMetrics ? totals.qualified : null,
      confirmedCommissionsCount: commCountValue,
      confirmedCommissionsEur: commEurValue,
      pendingCommissionsEur: !hasAnyMetrics || hideFinancials ? null : totals.pendingEur,
      ctrRate: safeRate(clicksValue, uniqueVisitors),
      clickToRegRate: safeRate(regsValue, clicksValue),
      regToFtdRate: safeRate(ftdValue, regsValue),
      clickToFtdRate: safeRate(ftdValue, clicksValue),
      epcEur: safeRate(commEurValue, clicksValue),
    },
    funnel: [
      { step: "visitors", count: uniqueVisitors, stepRate: null },
      {
        step: "clicks",
        count: clicksValue,
        stepRate: safeRate(clicksValue, uniqueVisitors),
        drillStep: "clicks",
      },
      {
        step: "registrations",
        count: regsValue,
        stepRate: safeRate(regsValue, clicksValue),
        drillStep: "registrations",
      },
      {
        step: "first_deposits",
        count: ftdValue,
        stepRate: safeRate(ftdValue, regsValue),
        drillStep: "first_deposits",
      },
      {
        step: "commissions",
        count: commCountValue,
        stepRate: safeRate(commCountValue, ftdValue),
        drillStep: "commissions",
      },
    ],
  };
}

interface BreakdownAccum {
  id: string;
  label: string;
  secondaryLabel?: string;
  trackingUnavailable: boolean;
  validClicks: number;
  registrations: number;
  firstDeposits: number;
  confirmedCount: number;
  confirmedEur: number;
}

export function accumulateBreakdown(
  rows: readonly BreakdownSourceRow[],
  dimension: DrillDimension,
  resolveLabel: (id: string) => { label: string; secondary?: string; trackingNone?: boolean },
  hideFinancials: boolean,
): BreakdownRow[] {
  const map = new Map<string, BreakdownAccum>();
  for (const r of rows) {
    const id =
      dimension === "country"
        ? r.countryCode
        : dimension === "bookmaker"
          ? r.bookmakerId
          : dimension === "campaign"
            ? r.campaignId
            : r.offerId;
    if (!id) continue;
    const meta = resolveLabel(id);
    let acc = map.get(id);
    if (!acc) {
      acc = {
        id,
        label: meta.label,
        secondaryLabel: meta.secondary,
        trackingUnavailable: Boolean(meta.trackingNone),
        validClicks: 0,
        registrations: 0,
        firstDeposits: 0,
        confirmedCount: 0,
        confirmedEur: 0,
      };
      map.set(id, acc);
    }
    acc.validClicks += r.validClicks;
    acc.registrations += r.registrations;
    acc.firstDeposits += r.firstDeposits;
    acc.confirmedCount += r.confirmedCommissionsCount;
    acc.confirmedEur += Number(r.confirmedCommissionsEur);
  }

  return Array.from(map.values())
    .map((item) => {
      const noConvData =
        item.trackingUnavailable &&
        item.registrations === 0 &&
        item.firstDeposits === 0 &&
        item.confirmedCount === 0;
      const regs = noConvData ? null : item.registrations;
      const ftds = noConvData ? null : item.firstDeposits;
      return {
        dimension,
        id: item.id,
        label: item.label,
        secondaryLabel: item.secondaryLabel,
        trackingUnavailable: noConvData,
        uniqueVisitors: null,
        validClicks: item.validClicks,
        registrations: regs,
        firstDeposits: ftds,
        clickToRegRate: safeRate(regs, item.validClicks),
        regToFtdRate: safeRate(ftds, regs),
        confirmedCommissionsCount: hideFinancials || noConvData ? null : item.confirmedCount,
        confirmedCommissionsEur: hideFinancials || noConvData ? null : item.confirmedEur,
      };
    })
    .sort(
      (a, b) => b.validClicks - a.validClicks || (b.firstDeposits ?? -1) - (a.firstDeposits ?? -1),
    );
}

export function buildTimeSeries(
  rows: readonly DailyMetricRowLike[],
  groupBy: MetricGroupBy,
  hideFinancials: boolean,
): TimeSeriesPoint[] {
  const buckets = new Map<string, TimeSeriesPoint>();
  for (const r of rows) {
    const period = getPeriodBucketKey(r.metricDate, groupBy);
    const existing = buckets.get(period) ?? {
      period,
      uniqueVisitors: 0,
      validClicks: 0,
      registrations: 0,
      firstDeposits: 0,
      confirmedCommissionsEur: 0,
    };
    existing.uniqueVisitors += r.uniqueVisitors;
    existing.validClicks += r.validClicks;
    existing.registrations += r.registrations;
    existing.firstDeposits += r.firstDeposits;
    if (!hideFinancials) {
      existing.confirmedCommissionsEur += Number(r.confirmedCommissionsEur);
    }
    buckets.set(period, existing);
  }
  return Array.from(buckets.values()).sort((a, b) => a.period.localeCompare(b.period));
}

export function buildCountryKpiBreakdown(params: {
  countries: readonly { code: string; nameFr: string }[];
  rows: readonly DailyMetricRowLike[];
  useDetailGrain: boolean;
  hasAnyMetrics: boolean;
  hideFinancials: boolean;
}): CountryKpiBreakdownRow[] {
  const { countries, rows, useDetailGrain, hasAnyMetrics, hideFinancials } = params;
  const map = new Map<
    string,
    {
      countryCode: string;
      countryName: string;
      uniqueVisitors: number;
      pageViews: number;
      offerViews: number;
      promoCopies: number;
      rawClicks: number;
      validClicks: number;
      registrations: number;
      firstDeposits: number;
      confirmedCommissionsCount: number;
      confirmedCommissionsEur: number;
    }
  >();

  for (const c of countries) {
    map.set(c.code, {
      countryCode: c.code,
      countryName: c.nameFr,
      uniqueVisitors: 0,
      pageViews: 0,
      offerViews: 0,
      promoCopies: 0,
      rawClicks: 0,
      validClicks: 0,
      registrations: 0,
      firstDeposits: 0,
      confirmedCommissionsCount: 0,
      confirmedCommissionsEur: 0,
    });
  }

  for (const r of rows) {
    if (!r.countryCode || r.countryCode === "ALL") continue;
    let entry = map.get(r.countryCode);
    if (!entry) {
      entry = {
        countryCode: r.countryCode,
        countryName: r.countryCode,
        uniqueVisitors: 0,
        pageViews: 0,
        offerViews: 0,
        promoCopies: 0,
        rawClicks: 0,
        validClicks: 0,
        registrations: 0,
        firstDeposits: 0,
        confirmedCommissionsCount: 0,
        confirmedCommissionsEur: 0,
      };
      map.set(r.countryCode, entry);
    }
    entry.uniqueVisitors += r.uniqueVisitors;
    entry.pageViews += r.pageViews;
    entry.offerViews += r.offerViews;
    entry.promoCopies += r.promoCopies;
    entry.rawClicks += r.rawClicks;
    entry.validClicks += r.validClicks;
    entry.registrations += r.registrations;
    entry.firstDeposits += r.firstDeposits;
    entry.confirmedCommissionsCount += r.confirmedCommissionsCount;
    entry.confirmedCommissionsEur += Number(r.confirmedCommissionsEur);
  }

  return Array.from(map.values())
    .map((item): CountryKpiBreakdownRow => {
      const visitors = useDetailGrain || !hasAnyMetrics ? null : item.uniqueVisitors;
      const regs = hasAnyMetrics ? item.registrations : null;
      const ftds = hasAnyMetrics ? item.firstDeposits : null;
      const commCount = !hasAnyMetrics || hideFinancials ? null : item.confirmedCommissionsCount;
      const commEur = !hasAnyMetrics || hideFinancials ? null : item.confirmedCommissionsEur;
      return {
        countryCode: item.countryCode,
        countryName: item.countryName,
        uniqueVisitors: visitors,
        pageViews: item.pageViews,
        offerViews: item.offerViews,
        promoCopies: item.promoCopies,
        rawClicks: item.rawClicks,
        validClicks: item.validClicks,
        registrations: regs,
        firstDeposits: ftds,
        confirmedCommissionsCount: commCount,
        confirmedCommissionsEur: commEur,
        ctrRate: safeRate(hasAnyMetrics ? item.validClicks : null, visitors),
        clickToRegRate: safeRate(regs, hasAnyMetrics ? item.validClicks : null),
        regToFtdRate: safeRate(ftds, regs),
        epcEur: safeRate(commEur, hasAnyMetrics ? item.validClicks : null),
      };
    })
    .sort(
      (a, b) =>
        (b.uniqueVisitors ?? 0) - (a.uniqueVisitors ?? 0) ||
        b.validClicks - a.validClicks ||
        a.countryName.localeCompare(b.countryName),
    );
}

function buildDelta(current: number, previous: number): MetricDeltaSummary {
  const deltaAbs = current - previous;
  const deltaPct = previous > 0 ? Math.round((deltaAbs / previous) * 1000) / 10 : null;
  const trend: MetricDeltaSummary["trend"] = deltaAbs > 0 ? "up" : deltaAbs < 0 ? "down" : "flat";
  return { current, previous, deltaAbs, deltaPct, trend };
}

export function computeDailyEvolution(
  timeSeries: readonly TimeSeriesPoint[],
): DailyEvolutionSummary {
  const emptyDelta: MetricDeltaSummary = {
    current: 0,
    previous: 0,
    deltaAbs: 0,
    deltaPct: null,
    trend: "flat",
  };
  if (timeSeries.length === 0) {
    return {
      latestPeriod: null,
      previousPeriod: null,
      visitors: emptyDelta,
      validClicks: emptyDelta,
      registrations: emptyDelta,
      firstDeposits: emptyDelta,
    };
  }
  const latest = timeSeries[timeSeries.length - 1]!;
  const previous = timeSeries.length >= 2 ? timeSeries[timeSeries.length - 2]! : null;
  if (!previous) {
    return {
      latestPeriod: latest.period,
      previousPeriod: null,
      visitors: buildDelta(latest.uniqueVisitors, 0),
      validClicks: buildDelta(latest.validClicks, 0),
      registrations: buildDelta(latest.registrations, 0),
      firstDeposits: buildDelta(latest.firstDeposits, 0),
    };
  }
  return {
    latestPeriod: latest.period,
    previousPeriod: previous.period,
    visitors: buildDelta(latest.uniqueVisitors, previous.uniqueVisitors),
    validClicks: buildDelta(latest.validClicks, previous.validClicks),
    registrations: buildDelta(latest.registrations, previous.registrations),
    firstDeposits: buildDelta(latest.firstDeposits, previous.firstDeposits),
  };
}
