import type { DrillDimension, DrillStep, MetricGroupBy } from "@/modules/intelligence/schema";

export interface IntelligenceKpis {
  uniqueVisitors: number | null;
  pageViews: number;
  offerViews: number;
  promoCopies: number;
  rawClicks: number;
  validClicks: number;
  registrations: number | null;
  firstDeposits: number | null;
  qualifiedConversions: number | null;
  confirmedCommissionsCount: number | null;
  confirmedCommissionsEur: number | null;
  pendingCommissionsEur: number | null;
  ctrRate: number | null;
  clickToRegRate: number | null;
  regToFtdRate: number | null;
  clickToFtdRate: number | null;
  epcEur: number | null;
}

export interface FunnelStageItem {
  step: "visitors" | "clicks" | "registrations" | "first_deposits" | "commissions";
  count: number | null;
  stepRate: number | null;
  drillStep?: DrillStep;
}

export interface TimeSeriesPoint {
  period: string;
  uniqueVisitors: number;
  validClicks: number;
  registrations: number;
  firstDeposits: number;
  confirmedCommissionsEur: number;
}

export interface BreakdownRow {
  dimension: DrillDimension;
  id: string;
  label: string;
  secondaryLabel?: string;
  trackingUnavailable: boolean;
  uniqueVisitors: number | null;
  validClicks: number;
  registrations: number | null;
  firstDeposits: number | null;
  clickToRegRate: number | null;
  regToFtdRate: number | null;
  confirmedCommissionsCount: number | null;
  confirmedCommissionsEur: number | null;
}

export interface NetworkFreshnessItem {
  networkId: string;
  name: string;
  trackingMode: string;
  lastPostbackAtIso: string | null;
  hasMissingTracking: boolean;
}

export interface DrilldownRow {
  id: string;
  occurredAtIso: string;
  bookmakerName: string;
  countryCode: string;
  typeOrStatus: string;
  sourceLabel: string;
  amountLabel: string;
}

export interface IntelligenceFilterOptions {
  countries: Array<{ code: string; name: string }>;
  bookmakers: Array<{ id: string; name: string }>;
  campaigns: Array<{ id: string; code: string; name: string }>;
}

export interface CountryKpiBreakdownRow {
  countryCode: string;
  countryName: string;
  uniqueVisitors: number | null;
  pageViews: number;
  offerViews: number;
  promoCopies: number;
  rawClicks: number;
  validClicks: number;
  registrations: number | null;
  firstDeposits: number | null;
  confirmedCommissionsCount: number | null;
  confirmedCommissionsEur: number | null;
  ctrRate: number | null;
  clickToRegRate: number | null;
  regToFtdRate: number | null;
  epcEur: number | null;
}

export interface IntelligenceDashboardData {
  filters: {
    fromDate: string;
    toDate: string;
    country: string;
    bookmakerId: string;
    campaignId: string;
    groupBy: MetricGroupBy;
  };
  canExport: boolean;
  canAggregate: boolean;
  hasAnyMetrics: boolean;
  lastAggregatedAtIso: string | null;
  kpis: IntelligenceKpis;
  funnel: FunnelStageItem[];
  timeSeries: TimeSeriesPoint[];
  byBookmaker: BreakdownRow[];
  byCountry: BreakdownRow[];
  kpiByCountry: CountryKpiBreakdownRow[];
  byCampaign: BreakdownRow[];
  byOffer: BreakdownRow[];
  topOffers: BreakdownRow[];
  networksFreshness: NetworkFreshnessItem[];
  filterOptions: IntelligenceFilterOptions;
  drilldown: {
    dimension: DrillDimension;
    id: string;
    step: DrillStep;
    rows: DrilldownRow[];
  } | null;
}
