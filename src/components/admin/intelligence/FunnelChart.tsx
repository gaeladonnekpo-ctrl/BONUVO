"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { formatMetricCount, formatRatioPercent } from "@/modules/intelligence/metrics-math";
import type { FunnelStageItem } from "@/modules/intelligence/stats-types";

const STEP_LABELS: Record<FunnelStageItem["step"], { fr: string; en: string }> = {
  visitors: { fr: "Visiteurs uniques", en: "Unique visitors" },
  clicks: { fr: "Clics valides (/go)", en: "Valid clicks (/go)" },
  registrations: { fr: "Inscriptions déclarées", en: "Reported registrations" },
  first_deposits: { fr: "Premiers dépôts (FTD)", en: "First deposits (FTD)" },
  commissions: { fr: "Commissions confirmées", en: "Confirmed commissions" },
};

export function FunnelChart({
  stages,
  locale,
  buildDrillHref,
}: {
  stages: readonly FunnelStageItem[];
  locale: "fr" | "en";
  buildDrillHref: (step: NonNullable<FunnelStageItem["drillStep"]>) => string;
}) {
  const maxVal = Math.max(
    1,
    ...stages.map((s) => (typeof s.count === "number" && s.count > 0 ? s.count : 0)),
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {locale === "en"
            ? "Acquisition Funnel (Verified Facts)"
            : "Entonnoir d'acquisition (faits mesurés)"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage) => {
          const widthPct =
            stage.count !== null && stage.count > 0
              ? Math.max(6, Math.min(100, Math.round((stage.count / maxVal) * 100)))
              : 0;
          const label = STEP_LABELS[stage.step][locale];
          const formattedCount = formatMetricCount(stage.count, locale);
          const rateLabel = formatRatioPercent(stage.stepRate, locale);

          return (
            <div key={stage.step} className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-fg">{label}</span>
                  {stage.stepRate !== null ? (
                    <span className="rounded bg-surface-subtle px-1.5 py-0.5 font-medium text-fg-muted">
                      {locale === "en" ? "Step rate:" : "Passage :"} {rateLabel}
                    </span>
                  ) : stage.step !== "visitors" ? (
                    <span className="text-fg-muted">
                      {locale === "en" ? "Step rate: —" : "Passage : —"}
                    </span>
                  ) : null}
                </div>
                {stage.drillStep && stage.count !== null ? (
                  <Link
                    href={buildDrillHref(stage.drillStep)}
                    className="font-display text-sm font-bold text-accent underline-offset-4 hover:underline"
                  >
                    {formattedCount}
                  </Link>
                ) : (
                  <span className="font-display text-sm font-bold text-fg">{formattedCount}</span>
                )}
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
