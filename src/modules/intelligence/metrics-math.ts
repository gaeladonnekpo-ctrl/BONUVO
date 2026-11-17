import { convertCurrencyAmount } from "@/lib/currency/converter";

export * from "@/modules/intelligence/metrics-format";

export type MetricGrain = "day_total" | "day_country" | "breakdown";

export interface RawVisitFact {
  metricDate: string;
  countryCode: string;
  bookmakerId: string | null;
  offerId: string | null;
  eventType: "page_view" | "offer_view" | "promo_copy";
  visitorDailyHash: string;
  isBot: boolean;
}

export interface RawClickFact {
  metricDate: string;
  countryCode: string;
  bookmakerId: string;
  offerId: string | null;
  campaignId: string | null;
  isBot: boolean;
  isSuspect: boolean;
}

export interface RawConversionFact {
  metricDate: string;
  countryCode: string;
  bookmakerId: string;
  offerId: string | null;
  campaignId: string | null;
  conversionType: "registration" | "first_deposit" | "qualified";
  status: "recorded" | "unattributed" | "rejected";
}

export interface RawCommissionFact {
  metricDate: string;
  countryCode: string;
  bookmakerId: string;
  offerId: string | null;
  campaignId: string | null;
  status: "pending" | "confirmed" | "rejected" | "paid";
  amount: number;
  currencyCode: string;
}

export interface ComputedDailyMetricRow {
  dimensionKey: string;
  grain: MetricGrain;
  metricDate: string;
  countryCode: string;
  bookmakerId: string | null;
  offerId: string | null;
  campaignId: string | null;
  uniqueVisitors: number;
  pageViews: number;
  offerViews: number;
  promoCopies: number;
  rawClicks: number;
  validClicks: number;
  registrations: number;
  firstDeposits: number;
  qualifiedConversions: number;
  confirmedCommissionsCount: number;
  confirmedCommissionsEur: string;
  pendingCommissionsEur: string;
}

export function buildMetricDimensionKey(params: {
  grain: MetricGrain;
  metricDate: string;
  countryCode: string;
  bookmakerId: string | null;
  offerId: string | null;
  campaignId: string | null;
}): string {
  return [
    params.grain,
    params.metricDate,
    params.countryCode,
    params.bookmakerId ?? "-",
    params.offerId ?? "-",
    params.campaignId ?? "-",
  ].join("|");
}

interface MutableBucket {
  grain: MetricGrain;
  metricDate: string;
  countryCode: string;
  bookmakerId: string | null;
  offerId: string | null;
  campaignId: string | null;
  visitors: Set<string>;
  pageViews: number;
  offerViews: number;
  promoCopies: number;
  rawClicks: number;
  validClicks: number;
  registrations: number;
  firstDeposits: number;
  qualifiedConversions: number;
  confirmedCommissionsCount: number;
  confirmedCommissionsEur: number;
  pendingCommissionsEur: number;
}

function getOrCreateBucket(
  map: Map<string, MutableBucket>,
  params: {
    grain: MetricGrain;
    metricDate: string;
    countryCode: string;
    bookmakerId: string | null;
    offerId: string | null;
    campaignId: string | null;
  },
): MutableBucket {
  const key = buildMetricDimensionKey(params);
  let bucket = map.get(key);
  if (!bucket) {
    bucket = {
      ...params,
      visitors: new Set<string>(),
      pageViews: 0,
      offerViews: 0,
      promoCopies: 0,
      rawClicks: 0,
      validClicks: 0,
      registrations: 0,
      firstDeposits: 0,
      qualifiedConversions: 0,
      confirmedCommissionsCount: 0,
      confirmedCommissionsEur: 0,
      pendingCommissionsEur: 0,
    };
    map.set(key, bucket);
  }
  return bucket;
}

function targetBucketsForFact(
  map: Map<string, MutableBucket>,
  fact: {
    metricDate: string;
    countryCode: string;
    bookmakerId: string | null;
    offerId: string | null;
    campaignId: string | null;
  },
): MutableBucket[] {
  const cc = fact.countryCode || "GLOBAL";
  return [
    getOrCreateBucket(map, {
      grain: "day_total",
      metricDate: fact.metricDate,
      countryCode: "ALL",
      bookmakerId: null,
      offerId: null,
      campaignId: null,
    }),
    getOrCreateBucket(map, {
      grain: "day_country",
      metricDate: fact.metricDate,
      countryCode: cc,
      bookmakerId: null,
      offerId: null,
      campaignId: null,
    }),
    getOrCreateBucket(map, {
      grain: "breakdown",
      metricDate: fact.metricDate,
      countryCode: cc,
      bookmakerId: fact.bookmakerId,
      offerId: fact.offerId,
      campaignId: fact.campaignId,
    }),
  ];
}

export function computeDailyMetricRows(input: {
  visits: readonly RawVisitFact[];
  clicks: readonly RawClickFact[];
  conversions: readonly RawConversionFact[];
  commissions: readonly RawCommissionFact[];
}): ComputedDailyMetricRow[] {
  const buckets = new Map<string, MutableBucket>();

  for (const visit of input.visits) {
    if (visit.isBot) continue;
    for (const bucket of targetBucketsForFact(buckets, {
      metricDate: visit.metricDate,
      countryCode: visit.countryCode,
      bookmakerId: visit.bookmakerId,
      offerId: visit.offerId,
      campaignId: null,
    })) {
      bucket.visitors.add(visit.visitorDailyHash);
      if (visit.eventType === "page_view") bucket.pageViews += 1;
      else if (visit.eventType === "offer_view") bucket.offerViews += 1;
      else if (visit.eventType === "promo_copy") bucket.promoCopies += 1;
    }
  }

  for (const click of input.clicks) {
    for (const bucket of targetBucketsForFact(buckets, {
      metricDate: click.metricDate,
      countryCode: click.countryCode,
      bookmakerId: click.bookmakerId,
      offerId: click.offerId,
      campaignId: click.campaignId,
    })) {
      bucket.rawClicks += 1;
      if (!click.isBot && !click.isSuspect) {
        bucket.validClicks += 1;
      }
    }
  }

  for (const conv of input.conversions) {
    if (conv.status === "rejected") continue;
    for (const bucket of targetBucketsForFact(buckets, {
      metricDate: conv.metricDate,
      countryCode: conv.countryCode,
      bookmakerId: conv.bookmakerId,
      offerId: conv.offerId,
      campaignId: conv.campaignId,
    })) {
      if (conv.conversionType === "registration") bucket.registrations += 1;
      else if (conv.conversionType === "first_deposit") bucket.firstDeposits += 1;
      else if (conv.conversionType === "qualified") bucket.qualifiedConversions += 1;
    }
  }

  for (const comm of input.commissions) {
    if (comm.status === "rejected" || comm.amount < 0) continue;
    const eur = convertCurrencyAmount({
      amount: comm.amount,
      fromCurrency: comm.currencyCode,
      toCurrency: "EUR",
    });
    for (const bucket of targetBucketsForFact(buckets, {
      metricDate: comm.metricDate,
      countryCode: comm.countryCode,
      bookmakerId: comm.bookmakerId,
      offerId: comm.offerId,
      campaignId: comm.campaignId,
    })) {
      if (comm.status === "confirmed" || comm.status === "paid") {
        bucket.confirmedCommissionsCount += 1;
        bucket.confirmedCommissionsEur += eur;
      } else if (comm.status === "pending") {
        bucket.pendingCommissionsEur += eur;
      }
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dimensionKey, b]) => ({
      dimensionKey,
      grain: b.grain,
      metricDate: b.metricDate,
      countryCode: b.countryCode,
      bookmakerId: b.bookmakerId,
      offerId: b.offerId,
      campaignId: b.campaignId,
      uniqueVisitors: b.visitors.size,
      pageViews: b.pageViews,
      offerViews: b.offerViews,
      promoCopies: b.promoCopies,
      rawClicks: b.rawClicks,
      validClicks: b.validClicks,
      registrations: b.registrations,
      firstDeposits: b.firstDeposits,
      qualifiedConversions: b.qualifiedConversions,
      confirmedCommissionsCount: b.confirmedCommissionsCount,
      confirmedCommissionsEur: b.confirmedCommissionsEur.toFixed(2),
      pendingCommissionsEur: b.pendingCommissionsEur.toFixed(2),
    }));
}
