"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  replayMetricsAggregationAction,
  type AggregationActionState,
} from "@/modules/intelligence/actions";
import type { NetworkFreshnessItem } from "@/modules/intelligence/stats-types";

export function FreshnessNote({
  lastAggregatedAtIso,
  fromDate,
  toDate,
  networks,
  canAggregate,
  locale,
}: {
  lastAggregatedAtIso: string | null;
  fromDate: string;
  toDate: string;
  networks: readonly NetworkFreshnessItem[];
  canAggregate: boolean;
  locale: "fr" | "en";
}) {
  const [state, formAction, isPending] = React.useActionState<
    AggregationActionState | null,
    FormData
  >(async (_prev, formData) => replayMetricsAggregationAction(formData), null);

  const formattedAgg = lastAggregatedAtIso
    ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(lastAggregatedAtIso))
    : "—";

  const missingNetworks = networks.filter((n) => n.hasMissingTracking);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-semibold">
          {locale === "en" ? "Data Freshness & Partner Sources" : "Fraîcheur des données & sources"}
        </CardTitle>
        {canAggregate ? (
          <form action={formAction} className="flex items-center gap-2">
            <input type="hidden" name="fromDate" value={fromDate} />
            <input type="hidden" name="toDate" value={toDate} />
            <Button type="submit" variant="outline" size="sm" disabled={isPending}>
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              {locale === "en" ? "Recalculate window" : "Recalculer l'agrégat"}
            </Button>
          </form>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-fg-muted">
          <span>
            {locale === "en" ? "Last aggregation:" : "Dernier agrégat :"}{" "}
            <strong className="text-fg">{formattedAgg}</strong>
          </span>
          <span>
            {locale === "en" ? "Window:" : "Fenêtre :"}{" "}
            <strong className="text-fg">
              {fromDate} → {toDate}
            </strong>
          </span>
        </div>

        {state ? (
          <p className={state.ok ? "font-medium text-emerald-500" : "font-medium text-amber-500"}>
            {state.message}
          </p>
        ) : null}

        {missingNetworks.length > 0 ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-300">
            {locale === "en"
              ? `Networks without postback/import (${missingNetworks.map((n) => n.name).join(", ")}): partner metrics display "—" ("data unavailable"), never estimated.`
              : `Réseaux sans postback ni import (${missingNetworks.map((n) => n.name).join(", ")}) : les métriques partenaires affichent « — » (données non disponibles), jamais d'estimation.`}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {networks.map((net) => (
            <div
              key={net.networkId}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-subtle px-2.5 py-1"
            >
              <span className="font-medium text-fg">{net.name}</span>
              <UiBadge tone={net.hasMissingTracking ? "warning" : "neutral"}>
                {net.trackingMode}
              </UiBadge>
              <span className="text-fg-muted">
                {net.lastPostbackAtIso
                  ? new Date(net.lastPostbackAtIso).toISOString().slice(0, 16).replace("T", " ")
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
