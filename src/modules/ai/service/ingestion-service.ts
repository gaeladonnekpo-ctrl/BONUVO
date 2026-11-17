import { and, desc, eq } from "drizzle-orm";
import { createSportsDataProvider } from "@/modules/ai/providers/api-football";
import type { SportsDataProvider } from "@/modules/ai/providers/types";
import {
  currentFootballSeasonYear,
  ensureDefaultProviderAndLeagues,
  upsertNormalizedFixtures,
} from "@/modules/ai/service/ingestion-helpers";
import { runIngestStatsJob } from "@/modules/ai/service/ingestion-stats-service";
import { resolveJobLockBackend } from "@/modules/intelligence/lock";
import { invalidatePublicCatalogTags } from "@/server/cache/catalog-tags";
import { withAppDb, type DbExecutionScope } from "@/server/db/context";
import { ingestionRuns, leagues, seasons } from "@/server/db/schema";

export {
  currentFootballSeasonYear,
  ensureDefaultProviderAndLeagues,
  runIngestStatsJob,
  upsertNormalizedFixtures,
};

export async function runIngestFixturesJob(options?: {
  provider?: SportsDataProvider;
  dbScope?: DbExecutionScope;
  invalidateCache?: boolean;
}) {
  const provider = options?.provider ?? createSportsDataProvider();
  const scope = options?.dbScope ?? "ai_pipeline";
  const lock = resolveJobLockBackend();
  if (!lock) {
    return {
      ok: false as const,
      status: 503,
      code: "LOCK_BACKEND_UNAVAILABLE",
      message: "Verrou Redis requis.",
    };
  }
  const lockToken = await lock.acquire("ai:ingest-fixtures", 300);
  if (!lockToken) {
    return {
      ok: false as const,
      status: 409,
      code: "JOB_LOCKED",
      message: "Ingestion déjà en cours.",
    };
  }

  try {
    if (!provider.isConfigured()) {
      await withAppDb({ scope }, async (db) => {
        await ensureDefaultProviderAndLeagues(db);
      });
      return {
        ok: true as const,
        configured: false,
        status: "skipped_unconfigured" as const,
        requestsMade: 0,
        itemsUpserted: 0,
      };
    }

    const now = new Date();
    const fromIso = new Date(now.getTime() - 24 * 3600_000).toISOString();
    const toIso = new Date(now.getTime() + 7 * 24 * 3600_000).toISOString();

    const summary = await withAppDb({ scope }, async (db) => {
      const providerRow = await ensureDefaultProviderAndLeagues(db);
      const [run] = await db
        .insert(ingestionRuns)
        .values({ providerId: providerRow.id, jobName: "ingest-fixtures", status: "running" })
        .returning();
      if (!run) throw new Error("RUN_INSERT_FAILED");

      let requestsMade = 0;
      let itemsUpserted = 0;
      let quotaRemaining: number | null = null;
      let stoppedByQuota = false;

      try {
        const trackedLeagues = await db
          .select()
          .from(leagues)
          .where(
            and(
              eq(leagues.providerId, providerRow.id),
              eq(leagues.tracked, true),
              eq(leagues.active, true),
            ),
          )
          .orderBy(leagues.priorityOrder);

        const seasonYear = currentFootballSeasonYear(now);
        for (const league of trackedLeagues) {
          if (quotaRemaining !== null && quotaRemaining <= providerRow.quotaReserve) {
            stoppedByQuota = true;
            break;
          }

          const [season] = await db
            .insert(seasons)
            .values({
              providerId: providerRow.id,
              leagueId: league.id,
              year: seasonYear,
              isCurrent: true,
            })
            .onConflictDoUpdate({
              target: [seasons.leagueId, seasons.year],
              set: { isCurrent: true },
            })
            .returning();
          if (!season) continue;

          const res = await provider.fetchUpcomingFixtures({
            leagueExternalId: league.externalId,
            seasonYear: season.year,
            fromDateIso: fromIso,
            toDateIso: toIso,
          });
          requestsMade += res.requestsMade;
          if (res.quota.remaining !== null) quotaRemaining = res.quota.remaining;

          itemsUpserted += await upsertNormalizedFixtures({
            db,
            providerId: providerRow.id,
            leagueId: league.id,
            seasonId: season.id,
            ingestionRunId: run.id,
            items: res.items,
          });
        }

        const finalStatus = stoppedByQuota ? "partial_quota_stop" : "completed";
        await db
          .update(ingestionRuns)
          .set({
            status: finalStatus,
            requestsMade,
            quotaRemaining,
            itemsUpserted,
            finishedAt: new Date(),
          })
          .where(eq(ingestionRuns.id, run.id));

        return { status: finalStatus, requestsMade, quotaRemaining, itemsUpserted };
      } catch (err) {
        const message = err instanceof Error ? err.message.slice(0, 240) : "INGEST_ERROR";
        const errStatus = message === "PROVIDER_QUOTA_EXCEEDED" ? "partial_quota_stop" : "failed";
        await db
          .update(ingestionRuns)
          .set({
            status: errStatus,
            requestsMade,
            quotaRemaining,
            itemsUpserted,
            errorSummary: message,
            finishedAt: new Date(),
          })
          .where(eq(ingestionRuns.id, run.id));
        return { status: errStatus, requestsMade, quotaRemaining, itemsUpserted, error: message };
      }
    });

    if (options?.invalidateCache !== false) {
      invalidatePublicCatalogTags(["predictions"]);
    }
    return { ok: true as const, configured: true, ...summary };
  } finally {
    await lock.release("ai:ingest-fixtures", lockToken);
  }
}

export async function getRecentIngestionOverview(dbScope: DbExecutionScope = "ai_pipeline") {
  return withAppDb({ scope: dbScope }, async (db) => {
    const providerRow = await ensureDefaultProviderAndLeagues(db);
    const [trackedLeagues, recentRuns] = await Promise.all([
      db.select().from(leagues).orderBy(leagues.priorityOrder),
      db.select().from(ingestionRuns).orderBy(desc(ingestionRuns.startedAt)).limit(25),
    ]);
    return { provider: providerRow, leagues: trackedLeagues, runs: recentRuns };
  });
}
