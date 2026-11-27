import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BreakdownTable } from "@/components/admin/intelligence/BreakdownTable";
import { DateRangePicker } from "@/components/admin/intelligence/DateRangePicker";
import { DrilldownPanel } from "@/components/admin/intelligence/DrilldownPanel";
import { FreshnessNote } from "@/components/admin/intelligence/FreshnessNote";
import { FunnelChart } from "@/components/admin/intelligence/FunnelChart";
import { KpiCountryBreakdownSection } from "@/components/admin/intelligence/KpiCountryBreakdownSection";
import { TimeSeriesChart } from "@/components/admin/intelligence/TimeSeriesChart";
import type { DrillDimension, DrillStep } from "@/modules/intelligence/schema";
import { queryIntelligenceDashboard } from "@/modules/intelligence/stats-queries";
import { requireAdminAccess } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminStatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const resolvedLocale = locale === "en" ? "en" : "fr";
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "stats.read");
  const rawSp = await searchParams;
  const flatSp: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(rawSp)) {
    if (typeof v === "string") flatSp[k] = v;
  }

  const data = await queryIntelligenceDashboard(actor, flatSp);

  function buildBaseParams(): URLSearchParams {
    const sp = new URLSearchParams();
    sp.set("from", data.filters.fromDate);
    sp.set("to", data.filters.toDate);
    if (data.filters.country !== "ALL") sp.set("country", data.filters.country);
    if (data.filters.bookmakerId) sp.set("bookmakerId", data.filters.bookmakerId);
    if (data.filters.campaignId) sp.set("campaignId", data.filters.campaignId);
    if (data.filters.groupBy !== "day") sp.set("groupBy", data.filters.groupBy);
    return sp;
  }

  function buildDrillHref(dimension: DrillDimension, id: string, step: DrillStep): string {
    const sp = buildBaseParams();
    sp.set("drillDimension", dimension);
    sp.set("drillId", id);
    sp.set("drillStep", step);
    return `/admin/statistiques?${sp.toString()}#drilldown-panel`;
  }

  function buildFunnelDrillHref(step: DrillStep): string {
    if (data.filters.bookmakerId)
      return buildDrillHref("bookmaker", data.filters.bookmakerId, step);
    if (data.filters.country !== "ALL")
      return buildDrillHref("country", data.filters.country, step);
    const sp = buildBaseParams();
    sp.set("drillDimension", "country");
    sp.set("drillId", "ALL");
    sp.set("drillStep", step);
    return `/admin/statistiques?${sp.toString()}#drilldown-panel`;
  }

  const baseQs = buildBaseParams().toString();
  const clearDrillHref = `/admin/statistiques?${baseQs}`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={
          resolvedLocale === "en"
            ? "BONUVO Intelligence · Analytics"
            : "BONUVO Intelligence · Statistiques"
        }
        description={
          resolvedLocale === "en"
            ? "Verified daily metrics aggregated from visit events, /go clicks, partner conversions and confirmed commissions."
            : "Tableaux de bord fiables issus des faits mesurés (visites anonymisées, clics /go, conversions et commissions)."
        }
        actions={
          data.canExport ? (
            <a
              href={`/api/admin/export/daily-overview?${baseQs}`}
              download
              className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:border-accent hover:text-accent"
            >
              {resolvedLocale === "en" ? "Export Daily CSV" : "Exporter CSV global"}
            </a>
          ) : undefined
        }
      />

      <FreshnessNote
        lastAggregatedAtIso={data.lastAggregatedAtIso}
        fromDate={data.filters.fromDate}
        toDate={data.filters.toDate}
        networks={data.networksFreshness}
        canAggregate={data.canAggregate}
        locale={resolvedLocale}
      />

      <DateRangePicker
        fromDate={data.filters.fromDate}
        toDate={data.filters.toDate}
        country={data.filters.country}
        bookmakerId={data.filters.bookmakerId}
        campaignId={data.filters.campaignId}
        groupBy={data.filters.groupBy}
        options={data.filterOptions}
        locale={resolvedLocale}
      />

      <KpiCountryBreakdownSection
        kpis={data.kpis}
        hasAnyMetrics={data.hasAnyMetrics}
        kpiByCountry={data.kpiByCountry}
        locale={resolvedLocale}
        drillHrefs={{
          clicks: data.hasAnyMetrics ? buildFunnelDrillHref("clicks") : undefined,
          registrations:
            data.kpis.registrations !== null ? buildFunnelDrillHref("registrations") : undefined,
          firstDeposits:
            data.kpis.firstDeposits !== null ? buildFunnelDrillHref("first_deposits") : undefined,
          commissions:
            data.kpis.confirmedCommissionsEur !== null
              ? buildFunnelDrillHref("commissions")
              : undefined,
        }}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <FunnelChart
            stages={data.funnel}
            locale={resolvedLocale}
            baseQueryString={baseQs}
            drillDimension={data.filters.bookmakerId ? "bookmaker" : "country"}
            drillId={data.filters.bookmakerId || data.filters.country}
          />
        </div>
        <div className="lg:col-span-3">
          <TimeSeriesChart
            data={data.timeSeries}
            groupBy={data.filters.groupBy}
            locale={resolvedLocale}
          />
        </div>
      </div>

      <BreakdownTable
        byBookmaker={data.byBookmaker}
        byCountry={data.byCountry}
        byCampaign={data.byCampaign}
        byOffer={data.byOffer}
        topOffers={data.topOffers}
        canExport={data.canExport}
        exportQueryString={baseQs}
        locale={resolvedLocale}
      />

      {data.drilldown ? (
        <DrilldownPanel
          dimension={data.drilldown.dimension}
          id={data.drilldown.id}
          step={data.drilldown.step}
          rows={data.drilldown.rows}
          clearHref={clearDrillHref}
          locale={resolvedLocale}
        />
      ) : null}
    </div>
  );
}
