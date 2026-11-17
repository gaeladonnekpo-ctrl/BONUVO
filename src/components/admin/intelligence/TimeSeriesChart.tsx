"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetricGroupBy } from "@/modules/intelligence/schema";
import type { TimeSeriesPoint } from "@/modules/intelligence/stats-types";

const emptySubscribe = () => () => {};

export function TimeSeriesChart({
  data,
  groupBy,
  locale,
}: {
  data: readonly TimeSeriesPoint[];
  groupBy: MetricGroupBy;
  locale: "fr" | "en";
}) {
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const granularityLabel =
    groupBy === "month"
      ? locale === "en"
        ? "Monthly"
        : "Mensuelle"
      : groupBy === "week"
        ? locale === "en"
          ? "Weekly"
          : "Hebdomadaire"
        : locale === "en"
          ? "Daily"
          : "Quotidienne";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">
          {locale === "en"
            ? `Performance Trend (${granularityLabel})`
            : `Évolution ${granularityLabel.toLowerCase()}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-fg-muted">
            {locale === "en"
              ? "No aggregated metrics recorded for the selected period."
              : "Aucune donnée agrégée sur la période sélectionnée."}
          </p>
        ) : !mounted ? (
          <div className="h-72 w-full animate-pulse rounded-lg bg-surface-subtle" />
        ) : (
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...data]} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="uniqueVisitors"
                  name={locale === "en" ? "Visitors" : "Visiteurs"}
                  stroke="#0ea5e9"
                  fill="#0ea5e9"
                  fillOpacity={0.14}
                />
                <Area
                  type="monotone"
                  dataKey="validClicks"
                  name={locale === "en" ? "Valid clicks" : "Clics valides"}
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.18}
                />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  name={locale === "en" ? "Registrations" : "Inscriptions"}
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.16}
                />
                <Area
                  type="monotone"
                  dataKey="firstDeposits"
                  name={locale === "en" ? "FTD" : "Premiers dépôts"}
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
