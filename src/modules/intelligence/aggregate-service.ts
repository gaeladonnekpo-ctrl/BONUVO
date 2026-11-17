import "server-only";

import { and, gte, lte, sql } from "drizzle-orm";
import { withAppDb, type DbExecutionScope } from "@/server/db/context";
import { dailyMetrics } from "@/server/db/schema";
import { loadRawFactsForRangeTx } from "@/modules/intelligence/aggregate-loader";
import { resolveJobLockBackend, type JobLockBackend } from "@/modules/intelligence/lock";
import { computeDailyMetricRows } from "@/modules/intelligence/metrics-math";
import { aggregateMetricsInputSchema } from "@/modules/intelligence/schema";

export interface AggregateMetricsResult {
  ok: boolean;
  status: number;
  code: string;
  message: string;
  fromDate: string;
  toDate: string;
  rowsWritten: number;
  uniqueDays: number;
}

function defaultWindowDates(): { fromDate: string; toDate: string } {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return {
    fromDate: yesterday.toISOString().slice(0, 10),
    toDate: now.toISOString().slice(0, 10),
  };
}

export async function runAggregateMetricsJob(params?: {
  fromDate?: string;
  toDate?: string;
  actorId?: string | null;
  dbScope?: Extract<DbExecutionScope, "stats_aggregator" | "user_session">;
  lockBackend?: JobLockBackend | null;
}): Promise<AggregateMetricsResult> {
  const defaults = defaultWindowDates();
  const parsed = aggregateMetricsInputSchema.safeParse({
    fromDate: params?.fromDate ?? defaults.fromDate,
    toDate: params?.toDate ?? defaults.toDate,
  });

  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_DATE_RANGE",
      message: parsed.error.issues[0]?.message ?? "Plage de dates invalide.",
      fromDate: defaults.fromDate,
      toDate: defaults.toDate,
      rowsWritten: 0,
      uniqueDays: 0,
    };
  }

  const fromDate = parsed.data.fromDate ?? defaults.fromDate;
  const toDate = parsed.data.toDate ?? defaults.toDate;
  const lockBackend =
    params?.lockBackend !== undefined ? params.lockBackend : resolveJobLockBackend();

  if (!lockBackend) {
    return {
      ok: false,
      status: 503,
      code: "LOCK_BACKEND_UNAVAILABLE",
      message: "Verrou distribué Redis non configuré.",
      fromDate,
      toDate,
      rowsWritten: 0,
      uniqueDays: 0,
    };
  }

  const lockToken = await lockBackend.acquire("aggregate-metrics", 300);
  if (!lockToken) {
    return {
      ok: false,
      status: 409,
      code: "AGGREGATION_IN_PROGRESS",
      message: "Une tâche d'agrégation est déjà en cours d'exécution.",
      fromDate,
      toDate,
      rowsWritten: 0,
      uniqueDays: 0,
    };
  }

  const startBound = new Date(`${fromDate}T00:00:00.000Z`);
  const endBound = new Date(`${toDate}T23:59:59.999Z`);
  const scope = params?.dbScope ?? "stats_aggregator";

  try {
    const result = await withAppDb({ scope, actorId: params?.actorId ?? null }, async (tx) => {
      const facts = await loadRawFactsForRangeTx(tx, startBound, endBound);
      const computed = computeDailyMetricRows(facts);

      await tx
        .delete(dailyMetrics)
        .where(and(gte(dailyMetrics.metricDate, fromDate), lte(dailyMetrics.metricDate, toDate)));

      const now = new Date();
      for (let i = 0; i < computed.length; i += 250) {
        const chunk = computed.slice(i, i + 250).map((row) => ({
          ...row,
          aggregatedAt: now,
        }));
        await tx
          .insert(dailyMetrics)
          .values(chunk)
          .onConflictDoUpdate({
            target: dailyMetrics.dimensionKey,
            set: {
              uniqueVisitors: sql`excluded.unique_visitors`,
              pageViews: sql`excluded.page_views`,
              offerViews: sql`excluded.offer_views`,
              promoCopies: sql`excluded.promo_copies`,
              rawClicks: sql`excluded.raw_clicks`,
              validClicks: sql`excluded.valid_clicks`,
              registrations: sql`excluded.registrations`,
              firstDeposits: sql`excluded.first_deposits`,
              qualifiedConversions: sql`excluded.qualified_conversions`,
              confirmedCommissionsCount: sql`excluded.confirmed_commissions_count`,
              confirmedCommissionsEur: sql`excluded.confirmed_commissions_eur`,
              pendingCommissionsEur: sql`excluded.pending_commissions_eur`,
              aggregatedAt: now,
            },
          });
      }

      const uniqueDays = new Set(computed.map((r) => r.metricDate)).size;
      return { rowsWritten: computed.length, uniqueDays };
    });

    return {
      ok: true,
      status: 200,
      code: "AGGREGATED",
      message: "Agrégation des métriques terminée avec succès.",
      fromDate,
      toDate,
      rowsWritten: result.rowsWritten,
      uniqueDays: result.uniqueDays,
    };
  } finally {
    await lockBackend.release("aggregate-metrics", lockToken);
  }
}
