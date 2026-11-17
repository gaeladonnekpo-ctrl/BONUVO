"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface AccuracyPoint {
  date: string;
  won: number;
  lost: number;
  winRatePct: number;
}

export interface AccuracyChartProps {
  timeline: AccuracyPoint[];
  locale?: string;
}

const emptySubscribe = () => () => {};

export function AccuracyChart({ timeline, locale = "fr" }: AccuracyChartProps) {
  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const isEn = locale === "en";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {isEn
            ? "Settled Forecast Accuracy Over Time"
            : "Évolution journalière des pronostics réglés"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">
            {isEn
              ? "No settled matches yet — chart populates automatically once finished fixtures are settled."
              : "Aucun match réglé pour le moment — le graphique se remplit automatiquement après règlement des rencontres terminées."}
          </p>
        ) : !isClient ? (
          <div className="h-64 w-full animate-pulse rounded-lg bg-surface-subtle" />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="won"
                  name={isEn ? "Won" : "Validés"}
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="lost"
                  name={isEn ? "Lost" : "Manqués"}
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
