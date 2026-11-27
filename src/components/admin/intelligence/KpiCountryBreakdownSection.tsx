"use client";

import * as React from "react";
import { ArrowUpRight, Globe, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import {
  formatMetricCount,
  formatMetricEur,
  formatRatioPercent,
} from "@/modules/intelligence/metrics-math";
import type { CountryKpiBreakdownRow, IntelligenceKpis } from "@/modules/intelligence/stats-types";

export type KpiIndicatorKey =
  "visitors" | "clicks" | "registrations" | "first_deposits" | "commissions" | "promo_copies";

interface IndicatorCardDef {
  key: KpiIndicatorKey;
  label: string;
  value: string;
  hint?: string;
  drillHref?: string;
}

export function KpiCountryBreakdownSection({
  kpis,
  hasAnyMetrics,
  kpiByCountry,
  locale,
  drillHrefs,
}: {
  kpis: IntelligenceKpis;
  hasAnyMetrics: boolean;
  kpiByCountry: readonly CountryKpiBreakdownRow[];
  locale: "fr" | "en";
  drillHrefs: {
    clicks?: string;
    registrations?: string;
    firstDeposits?: string;
    commissions?: string;
  };
}) {
  const isEn = locale === "en";
  const [selectedKey, setSelectedKey] = React.useState<KpiIndicatorKey | null>(null);

  const cards: IndicatorCardDef[] = [
    {
      key: "visitors",
      label: isEn ? "Unique visitors" : "Visiteurs uniques",
      value: formatMetricCount(kpis.uniqueVisitors, locale),
      hint: hasAnyMetrics
        ? `${formatMetricCount(kpis.pageViews, locale)} ${isEn ? "page views" : "pages vues"}`
        : undefined,
    },
    {
      key: "clicks",
      label: isEn ? "Valid clicks" : "Clics valides",
      value: hasAnyMetrics ? formatMetricCount(kpis.validClicks, locale) : "—",
      hint: `CTR ${formatRatioPercent(kpis.ctrRate, locale)}`,
      drillHref: drillHrefs.clicks,
    },
    {
      key: "registrations",
      label: isEn ? "Registrations" : "Inscriptions",
      value: formatMetricCount(kpis.registrations, locale),
      hint: `Clic → Insc. ${formatRatioPercent(kpis.clickToRegRate, locale)}`,
      drillHref: drillHrefs.registrations,
    },
    {
      key: "first_deposits",
      label: isEn ? "First deposits (FTD)" : "Premiers dépôts",
      value: formatMetricCount(kpis.firstDeposits, locale),
      hint: `Insc. → FTD ${formatRatioPercent(kpis.regToFtdRate, locale)}`,
      drillHref: drillHrefs.firstDeposits,
    },
    {
      key: "commissions",
      label: isEn ? "Confirmed Comm." : "Comm. confirmées",
      value: formatMetricEur(kpis.confirmedCommissionsEur, locale),
      hint: `EPC ${formatMetricEur(kpis.epcEur, locale)}`,
      drillHref: drillHrefs.commissions,
    },
    {
      key: "promo_copies",
      label: isEn ? "Promo copies" : "Codes copiés",
      value: hasAnyMetrics ? formatMetricCount(kpis.promoCopies, locale) : "—",
      hint: hasAnyMetrics
        ? `${formatMetricCount(kpis.offerViews, locale)} ${isEn ? "offer views" : "vues d'offres"}`
        : undefined,
    },
  ];

  const activeCard = selectedKey ? (cards.find((c) => c.key === selectedKey) ?? null) : null;

  const countryRows = React.useMemo(() => {
    if (!selectedKey) return [];
    const getNumeric = (row: CountryKpiBreakdownRow): number => {
      switch (selectedKey) {
        case "visitors":
          return row.uniqueVisitors ?? 0;
        case "clicks":
          return row.validClicks;
        case "registrations":
          return row.registrations ?? 0;
        case "first_deposits":
          return row.firstDeposits ?? 0;
        case "commissions":
          return row.confirmedCommissionsEur ?? 0;
        case "promo_copies":
          return row.promoCopies;
      }
    };

    const sorted = [...kpiByCountry].sort(
      (a, b) => getNumeric(b) - getNumeric(a) || a.countryName.localeCompare(b.countryName),
    );
    const totalSum = sorted.reduce((acc, r) => acc + Math.max(0, getNumeric(r)), 0);

    return sorted.map((row) => {
      const num = getNumeric(row);
      const sharePct = totalSum > 0 ? Math.round((num / totalSum) * 1000) / 10 : 0;
      let primaryText = "—";
      let secondaryText = "";

      if (selectedKey === "visitors") {
        primaryText = formatMetricCount(row.uniqueVisitors, locale);
        secondaryText = `${formatMetricCount(row.pageViews, locale)} ${isEn ? "pages" : "pages vues"}`;
      } else if (selectedKey === "clicks") {
        primaryText = hasAnyMetrics ? formatMetricCount(row.validClicks, locale) : "—";
        secondaryText = `CTR ${formatRatioPercent(row.ctrRate, locale)}`;
      } else if (selectedKey === "registrations") {
        primaryText = formatMetricCount(row.registrations, locale);
        secondaryText = `Clic → Insc. ${formatRatioPercent(row.clickToRegRate, locale)}`;
      } else if (selectedKey === "first_deposits") {
        primaryText = formatMetricCount(row.firstDeposits, locale);
        secondaryText = `Insc. → FTD ${formatRatioPercent(row.regToFtdRate, locale)}`;
      } else if (selectedKey === "commissions") {
        primaryText = formatMetricEur(row.confirmedCommissionsEur, locale);
        secondaryText = `EPC ${formatMetricEur(row.epcEur, locale)}`;
      } else if (selectedKey === "promo_copies") {
        primaryText = hasAnyMetrics ? formatMetricCount(row.promoCopies, locale) : "—";
        secondaryText = `${formatMetricCount(row.offerViews, locale)} ${isEn ? "offer views" : "vues d'offres"}`;
      }

      return {
        countryCode: row.countryCode,
        countryName: row.countryName,
        primaryText,
        secondaryText,
        sharePct,
      };
    });
  }, [selectedKey, kpiByCountry, locale, isEn, hasAnyMetrics]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => {
          const isSelected = selectedKey === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setSelectedKey((prev) => (prev === card.key ? null : card.key))}
              aria-expanded={isSelected}
              className="block h-full w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Card
                className={`h-full transition-colors ${
                  isSelected
                    ? "border-accent bg-accent/5 ring-1 ring-accent/40"
                    : "hover:border-accent/50"
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1.5">
                  <CardTitle className="text-xs font-medium text-fg-muted">{card.label}</CardTitle>
                  <Globe
                    className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-accent" : "text-fg-muted"}`}
                    aria-hidden="true"
                  />
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                    {card.value}
                  </div>
                  {card.hint ? <p className="text-xs text-fg-muted">{card.hint}</p> : null}
                  <p className="pt-0.5 text-[11px] font-medium text-accent">
                    {isSelected
                      ? isEn
                        ? "Country breakdown open"
                        : "Répartition par pays ouverte"
                      : isEn
                        ? "Click for countries"
                        : "Voir par pays"}
                  </p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {activeCard ? (
        <Card className="border-accent/50">
          <CardHeader className="flex flex-col gap-3 border-b border-border/70 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Globe className="h-4 w-4 text-accent" aria-hidden="true" />
                <span>
                  {isEn
                    ? `Breakdown by country · ${activeCard.label}`
                    : `Répartition par pays · ${activeCard.label}`}
                </span>
                <span className="rounded bg-surface-elevated px-2 py-0.5 font-mono text-xs font-bold text-fg">
                  {activeCard.value}
                </span>
              </CardTitle>
              <p className="text-xs text-fg-muted">
                {isEn
                  ? `${countryRows.length} available countries`
                  : `${countryRows.length} pays disponibles`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeCard.drillHref ? (
                <Link
                  href={activeCard.drillHref}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-fg hover:border-accent hover:text-accent"
                >
                  <span>{isEn ? "Underlying rows" : "Lignes détaillées"}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedKey(null)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-fg-muted hover:text-fg"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isEn ? "Close" : "Fermer"}</span>
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {countryRows.length === 0 ? (
              <p className="py-3 text-xs text-fg-muted">
                {isEn ? "No active countries available." : "Aucun pays actif disponible."}
              </p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {countryRows.map((row) => (
                  <div
                    key={row.countryCode}
                    className="space-y-1.5 rounded-xl border border-border/80 bg-surface-subtle/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-[11px] font-bold text-fg">
                          {row.countryCode}
                        </span>
                        <span className="truncate text-xs font-semibold text-fg">
                          {row.countryName}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-bold text-fg">{row.primaryText}</span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, row.sharePct))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-fg-muted">
                      <span>{row.secondaryText}</span>
                      <span className="font-mono">{row.sharePct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
