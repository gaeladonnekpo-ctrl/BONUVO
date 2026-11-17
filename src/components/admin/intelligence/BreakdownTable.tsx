"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import {
  formatMetricCount,
  formatMetricEur,
  formatRatioPercent,
} from "@/modules/intelligence/metrics-math";
import type { DrillDimension, DrillStep, ExportReportType } from "@/modules/intelligence/schema";
import type { BreakdownRow } from "@/modules/intelligence/stats-types";

type TabKey = "bookmakers" | "countries" | "campaigns" | "offers" | "topOffers";

const TAB_TO_REPORT: Record<TabKey, ExportReportType> = {
  bookmakers: "bookmakers",
  countries: "countries",
  campaigns: "campaigns",
  offers: "offers",
  topOffers: "offers",
};

export function BreakdownTable({
  byBookmaker,
  byCountry,
  byCampaign,
  byOffer,
  topOffers,
  canExport,
  exportQueryString,
  locale,
}: {
  byBookmaker: readonly BreakdownRow[];
  byCountry: readonly BreakdownRow[];
  byCampaign: readonly BreakdownRow[];
  byOffer: readonly BreakdownRow[];
  topOffers: readonly BreakdownRow[];
  canExport: boolean;
  exportQueryString: string;
  locale: "fr" | "en";
}) {
  const [tab, setTab] = React.useState<TabKey>("bookmakers");

  function buildDrillHref(dimension: DrillDimension, id: string, step: DrillStep): string {
    const sp = new URLSearchParams(exportQueryString);
    sp.set("drillDimension", dimension);
    sp.set("drillId", id);
    sp.set("drillStep", step);
    return `/admin/statistiques?${sp.toString()}#drilldown-panel`;
  }

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "bookmakers", label: "Bookmakers" },
    { key: "countries", label: locale === "en" ? "Countries" : "Pays" },
    { key: "campaigns", label: locale === "en" ? "Campaigns" : "Campagnes" },
    { key: "offers", label: locale === "en" ? "Offers" : "Offres" },
    { key: "topOffers", label: locale === "en" ? "Top Offers" : "Top offres" },
  ];

  const rows =
    tab === "bookmakers"
      ? byBookmaker
      : tab === "countries"
        ? byCountry
        : tab === "campaigns"
          ? byCampaign
          : tab === "offers"
            ? byOffer
            : topOffers;

  const exportUrl = `/api/admin/export/${TAB_TO_REPORT[tab]}?${exportQueryString}`;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base">
          {locale === "en" ? "Performance Breakdown" : "Performances détaillées"}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Dimensions">
            {tabs.map((item) => (
              <Button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                size="sm"
                variant={tab === item.key ? "primary" : "outline"}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          {canExport ? (
            <a
              href={exportUrl}
              download
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-subtle px-3 text-xs font-semibold text-fg transition-colors hover:border-accent hover:text-accent"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              CSV
            </a>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">
            {locale === "en"
              ? "No breakdown rows found for these filters."
              : "Aucune ligne agrégée pour ces filtres."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-fg-muted">
                  <th className="py-2 pr-3">{locale === "en" ? "Dimension" : "Élément"}</th>
                  <th className="px-3 py-2 text-right">
                    {locale === "en" ? "Valid clicks" : "Clics valides"}
                  </th>
                  <th className="px-3 py-2 text-right">
                    {locale === "en" ? "Registrations" : "Inscriptions"}
                  </th>
                  <th className="px-3 py-2 text-right">FTD</th>
                  <th className="px-3 py-2 text-right">Clic → Insc.</th>
                  <th className="px-3 py-2 text-right">Insc. → FTD</th>
                  <th className="pl-3 py-2 text-right">
                    {locale === "en" ? "Confirmed Comm." : "Comm. confirmées"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {rows.map((row) => (
                  <tr key={`${row.dimension}-${row.id}`} className="hover:bg-surface-subtle/50">
                    <td className="py-2.5 pr-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-fg">{row.label}</span>
                        {row.secondaryLabel ? (
                          <span className="text-xs text-fg-muted">{row.secondaryLabel}</span>
                        ) : null}
                        {row.trackingUnavailable ? (
                          <UiBadge tone="warning">
                            {locale === "en" ? "data unavailable" : "données non disponibles"}
                          </UiBadge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      <Link
                        href={buildDrillHref(row.dimension, row.id, "clicks")}
                        className="text-accent underline-offset-4 hover:underline"
                      >
                        {formatMetricCount(row.validClicks, locale)}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {row.registrations !== null ? (
                        <Link
                          href={buildDrillHref(row.dimension, row.id, "registrations")}
                          className="text-accent underline-offset-4 hover:underline"
                        >
                          {formatMetricCount(row.registrations, locale)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {row.firstDeposits !== null ? (
                        <Link
                          href={buildDrillHref(row.dimension, row.id, "first_deposits")}
                          className="text-accent underline-offset-4 hover:underline"
                        >
                          {formatMetricCount(row.firstDeposits, locale)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-fg-muted">
                      {formatRatioPercent(row.clickToRegRate, locale)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-fg-muted">
                      {formatRatioPercent(row.regToFtdRate, locale)}
                    </td>
                    <td className="pl-3 py-2.5 text-right font-mono">
                      {row.confirmedCommissionsEur !== null ? (
                        <Link
                          href={buildDrillHref(row.dimension, row.id, "commissions")}
                          className="font-semibold text-fg underline-offset-4 hover:text-accent hover:underline"
                        >
                          {formatMetricEur(row.confirmedCommissionsEur, locale)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
