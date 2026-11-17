"use client";

import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { DrillDimension, DrillStep } from "@/modules/intelligence/schema";
import type { DrilldownRow } from "@/modules/intelligence/stats-types";

export function DrilldownPanel({
  dimension,
  id,
  step,
  rows,
  clearHref,
  locale,
}: {
  dimension: DrillDimension;
  id: string;
  step: DrillStep;
  rows: readonly DrilldownRow[];
  clearHref: string;
  locale: "fr" | "en";
}) {
  return (
    <Card id="drilldown-panel" className="border-accent/40">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-semibold">
          {locale === "en"
            ? `Underlying rows · ${step} (${dimension}: ${id})`
            : `Détail des lignes · ${step} (${dimension} : ${id})`}
        </CardTitle>
        <Link
          href={clearHref}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-fg-muted hover:text-fg"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          {locale === "en" ? "Close" : "Fermer"}
        </Link>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-4 text-xs text-fg-muted">
            {locale === "en"
              ? "No underlying non-PII records match this filter."
              : "Aucune ligne sous-jacente disponible pour ce filtre (max 50 lignes, sans PII)."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead>
                <tr className="border-b border-border uppercase text-fg-muted">
                  <th className="py-2 pr-3">Date UTC</th>
                  <th className="px-3 py-2">Bookmaker</th>
                  <th className="px-3 py-2">{locale === "en" ? "Country" : "Pays"}</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="pl-3 py-2 text-right">{locale === "en" ? "Amount" : "Montant"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3 font-mono text-fg-muted">
                      {r.occurredAtIso.slice(0, 19).replace("T", " ")}
                    </td>
                    <td className="px-3 py-2 font-medium text-fg">{r.bookmakerName}</td>
                    <td className="px-3 py-2">{r.countryCode}</td>
                    <td className="px-3 py-2">{r.typeOrStatus}</td>
                    <td className="px-3 py-2 font-mono text-fg-muted">{r.sourceLabel}</td>
                    <td className="pl-3 py-2 text-right font-mono">{r.amountLabel}</td>
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
