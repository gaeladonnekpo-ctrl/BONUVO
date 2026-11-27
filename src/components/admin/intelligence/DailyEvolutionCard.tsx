"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMetricCount } from "@/modules/intelligence/metrics-math";
import type { DailyEvolutionSummary, MetricDeltaSummary } from "@/modules/intelligence/stats-types";

function DeltaCell({
  label,
  delta,
  locale,
}: {
  label: string;
  delta: MetricDeltaSummary;
  locale: "fr" | "en";
}) {
  const sign = delta.deltaAbs > 0 ? "+" : "";
  const pctText =
    delta.deltaPct !== null ? `${delta.deltaPct > 0 ? "+" : ""}${delta.deltaPct}%` : "—";

  const toneClass =
    delta.trend === "up" ? "text-trust" : delta.trend === "down" ? "text-danger" : "text-fg-muted";

  const Icon =
    delta.trend === "up" ? ArrowUpRight : delta.trend === "down" ? ArrowDownRight : Minus;

  return (
    <div className="rounded-xl border border-border/80 bg-surface-subtle/60 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-fg-muted">{label}</span>
        <span
          className={`inline-flex items-center gap-0.5 font-mono text-xs font-bold ${toneClass}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {pctText}
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="font-display text-xl font-bold text-fg">
          {formatMetricCount(delta.current, locale)}
        </span>
        <span className={`font-mono text-xs font-semibold ${toneClass}`}>
          {sign}
          {formatMetricCount(delta.deltaAbs, locale)}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-fg-muted">
        {locale === "en" ? "Previous:" : "Période préc. :"}{" "}
        {formatMetricCount(delta.previous, locale)}
      </p>
    </div>
  );
}

export function DailyEvolutionCard({
  evolution,
  locale,
}: {
  evolution: DailyEvolutionSummary;
  locale: "fr" | "en";
}) {
  if (!evolution.latestPeriod) return null;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">
          {locale === "en"
            ? "Period-over-Period Daily Variations"
            : "Évolution quotidienne & variations (absolues / %)"}
        </CardTitle>
        <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-0.5 font-mono text-[11px] text-fg-muted">
          {evolution.previousPeriod
            ? `${evolution.previousPeriod} → ${evolution.latestPeriod}`
            : evolution.latestPeriod}
        </span>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DeltaCell
          label={locale === "en" ? "Unique visitors" : "Visiteurs uniques"}
          delta={evolution.visitors}
          locale={locale}
        />
        <DeltaCell
          label={locale === "en" ? "Valid clicks" : "Clics valides"}
          delta={evolution.validClicks}
          locale={locale}
        />
        <DeltaCell
          label={locale === "en" ? "Registrations" : "Inscriptions"}
          delta={evolution.registrations}
          locale={locale}
        />
        <DeltaCell
          label={locale === "en" ? "First deposits (FTD)" : "Premiers dépôts (FTD)"}
          delta={evolution.firstDeposits}
          locale={locale}
        />
      </CardContent>
    </Card>
  );
}
