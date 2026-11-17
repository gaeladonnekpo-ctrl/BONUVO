import type { MetricGroupBy } from "@/modules/intelligence/schema";

export function safeRate(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator <= 0) {
    return null;
  }
  return numerator / denominator;
}

export function formatRatioPercent(rate: number | null, locale: "fr" | "en"): string {
  if (rate === null || !Number.isFinite(rate)) {
    return "—";
  }
  const pct = (rate * 100).toFixed(1);
  return locale === "fr" ? `${pct} %` : `${pct}%`;
}

export function formatMetricCount(value: number | null, locale: "fr" | "en"): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value);
}

export function formatMetricEur(value: number | null, locale: "fr" | "en"): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  const formatted = new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} EUR`;
}

export function getPeriodBucketKey(metricDate: string, groupBy: MetricGroupBy): string {
  if (groupBy === "month") {
    return metricDate.slice(0, 7);
  }
  if (groupBy === "week") {
    const dt = new Date(`${metricDate}T00:00:00.000Z`);
    const day = dt.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setUTCDate(dt.getUTCDate() + diff);
    return dt.toISOString().slice(0, 10);
  }
  return metricDate;
}
