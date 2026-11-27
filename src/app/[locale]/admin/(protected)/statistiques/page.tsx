import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BreakdownTable } from "@/components/admin/intelligence/BreakdownTable";
import { DailyEvolutionCard } from "@/components/admin/intelligence/DailyEvolutionCard";
import { DateRangePicker } from "@/components/admin/intelligence/DateRangePicker";
import { DrilldownPanel } from "@/components/admin/intelligence/DrilldownPanel";
import { FreshnessNote } from "@/components/admin/intelligence/FreshnessNote";
import { FunnelChart } from "@/components/admin/intelligence/FunnelChart";
import { KpiCard } from "@/components/admin/intelligence/KpiCard";
import { TimeSeriesChart } from "@/components/admin/intelligence/TimeSeriesChart";
import {
  formatMetricCount,
  formatMetricEur,
  formatRatioPercent,
} from "@/modules/intelligence/metrics-math";
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
    if (!data.filters.includeReference) sp.set("demo", "0");
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
        includeReference={data.filters.includeReference}
        options={data.filterOptions}
        locale={resolvedLocale}
      />

      {data.referenceMeta.active ? (
        <div className="rounded-xl border border-accent/40 bg-accent/5 p-3.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-accent">
              {resolvedLocale === "en"
                ? "Reference Partner Dataset Active (Blended with Real Metrics)"
                : "Jeu de données de référence actif (Simulé + Données réelles combinées)"}
            </span>
            <span className="font-mono text-[11px] text-fg-muted">
              {resolvedLocale === "en" ? "Reference:" : "Référence :"} 1 500 vis. · 998 clics · 900
              insc. · 851 FTD · 1 200 codes |{" "}
              {resolvedLocale === "en" ? "Real collected:" : "Réel collecté :"}{" "}
              {formatMetricCount(data.referenceMeta.realTotals.uniqueVisitors, resolvedLocale)} vis.
              · {formatMetricCount(data.referenceMeta.realTotals.validClicks, resolvedLocale)} clics
              · {formatMetricCount(data.referenceMeta.realTotals.registrations, resolvedLocale)}{" "}
              insc. ·{" "}
              {formatMetricCount(data.referenceMeta.realTotals.firstDeposits, resolvedLocale)} FTD ·{" "}
              {formatMetricCount(data.referenceMeta.realTotals.promoCopies, resolvedLocale)} codes
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label={resolvedLocale === "en" ? "Unique visitors" : "Visiteurs uniques"}
          value={formatMetricCount(data.kpis.uniqueVisitors, resolvedLocale)}
          badgeText={
            data.dailyEvolution.visitors.deltaPct !== null
              ? `${data.dailyEvolution.visitors.deltaPct > 0 ? "+" : ""}${data.dailyEvolution.visitors.deltaPct}%`
              : undefined
          }
          hint={
            data.hasAnyMetrics
              ? `${formatMetricCount(data.kpis.pageViews, resolvedLocale)} ${resolvedLocale === "en" ? "page views" : "pages vues"}`
              : undefined
          }
        />
        <KpiCard
          label={resolvedLocale === "en" ? "Valid clicks" : "Clics valides"}
          value={
            data.hasAnyMetrics ? formatMetricCount(data.kpis.validClicks, resolvedLocale) : "—"
          }
          badgeText={
            data.dailyEvolution.validClicks.deltaPct !== null
              ? `${data.dailyEvolution.validClicks.deltaPct > 0 ? "+" : ""}${data.dailyEvolution.validClicks.deltaPct}%`
              : undefined
          }
          hint={`CTR ${formatRatioPercent(data.kpis.ctrRate, resolvedLocale)}`}
          href={data.hasAnyMetrics ? buildFunnelDrillHref("clicks") : undefined}
        />
        <KpiCard
          label={resolvedLocale === "en" ? "Registrations" : "Inscriptions"}
          value={formatMetricCount(data.kpis.registrations, resolvedLocale)}
          badgeText={
            data.dailyEvolution.registrations.deltaPct !== null
              ? `${data.dailyEvolution.registrations.deltaPct > 0 ? "+" : ""}${data.dailyEvolution.registrations.deltaPct}%`
              : undefined
          }
          hint={`Clic → Insc. ${formatRatioPercent(data.kpis.clickToRegRate, resolvedLocale)}`}
          href={
            data.kpis.registrations !== null ? buildFunnelDrillHref("registrations") : undefined
          }
        />
        <KpiCard
          label={resolvedLocale === "en" ? "First deposits (FTD)" : "Premiers dépôts"}
          value={formatMetricCount(data.kpis.firstDeposits, resolvedLocale)}
          badgeText={
            data.dailyEvolution.firstDeposits.deltaPct !== null
              ? `${data.dailyEvolution.firstDeposits.deltaPct > 0 ? "+" : ""}${data.dailyEvolution.firstDeposits.deltaPct}%`
              : undefined
          }
          hint={`Insc. → FTD ${formatRatioPercent(data.kpis.regToFtdRate, resolvedLocale)}`}
          href={
            data.kpis.firstDeposits !== null ? buildFunnelDrillHref("first_deposits") : undefined
          }
        />
        <KpiCard
          label={resolvedLocale === "en" ? "Confirmed Comm." : "Comm. confirmées"}
          value={formatMetricEur(data.kpis.confirmedCommissionsEur, resolvedLocale)}
          hint={`EPC ${formatMetricEur(data.kpis.epcEur, resolvedLocale)}`}
          href={
            data.kpis.confirmedCommissionsEur !== null
              ? buildFunnelDrillHref("commissions")
              : undefined
          }
        />
        <KpiCard
          label={resolvedLocale === "en" ? "Promo copies" : "Codes copiés"}
          value={
            data.hasAnyMetrics ? formatMetricCount(data.kpis.promoCopies, resolvedLocale) : "—"
          }
          hint={
            data.hasAnyMetrics
              ? `${formatMetricCount(data.kpis.offerViews, resolvedLocale)} ${resolvedLocale === "en" ? "offer views" : "vues d'offres"}`
              : undefined
          }
        />
      </div>

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

      <DailyEvolutionCard evolution={data.dailyEvolution} locale={resolvedLocale} />

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
