import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { EspnSoccerProvider } from "@/modules/ai/providers/espn-soccer";
import {
  currentFootballSeasonYear,
  ensureProviderAndLeagues,
  upsertNormalizedFixtures,
} from "@/modules/ai/service/ingestion-helpers";
import { runIngestStatsJob } from "@/modules/ai/service/ingestion-stats-service";
import {
  isFixtureInActiveWindow,
  refreshLiveFixturesForLeagueIds,
} from "@/modules/ai/service/live-fixture-sync";
import {
  runComputePredictionsJob,
  runSettlePredictionsJob,
} from "@/modules/ai/service/prediction-service";
import { queryPublicFixturesUncached } from "@/modules/ai/service/public-ai-service";
import type { LeagueFilterOption, PublicFixtureDto } from "@/modules/ai/service/public-ai-types";
import { withAppDb } from "@/server/db/context";
import { fixtures, ingestionRuns, leagues, predictions, seasons } from "@/server/db/schema";

const SYNC_TTL_MS = 90_000;
const recentDateSyncs = new Map<string, number>();

export function formatUtcDateIso(date: Date, tzOffsetMinutes = 60): string {
  const shifted = new Date(date.getTime() + tzOffsetMinutes * 60_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function resolveDayWindowUtc(
  dateIso: string,
  tzOffsetMinutes = 60,
): { fromDateIso: string; toDateIso: string; startDate: Date; endDate: Date } {
  const parts = dateIso.split("-").map((n) => Number.parseInt(n, 10));
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const utcMidnight = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const startMs = utcMidnight - tzOffsetMinutes * 60_000;
  const endMs = startMs + 24 * 3600_000 - 1;
  const startDate = new Date(startMs);
  const endDate = new Date(endMs);
  return {
    fromDateIso: startDate.toISOString(),
    toDateIso: endDate.toISOString(),
    startDate,
    endDate,
  };
}

export async function syncAndQueryFixturesByDate(params: {
  dateIso: string;
  tzOffsetMinutes?: number;
  forceSync?: boolean;
  syncPolicy?: "blocking" | "if_empty";
}): Promise<{
  dateIso: string;
  fixtures: PublicFixtureDto[];
  leagues: LeagueFilterOption[];
  syncedAt: string;
}> {
  const tz = params.tzOffsetMinutes ?? 60;
  const { fromDateIso, toDateIso, startDate, endDate } = resolveDayWindowUtc(params.dateIso, tz);
  const now = new Date();
  const cacheKey = `${params.dateIso}`;
  const lastSync = recentDateSyncs.get(cacheKey) ?? 0;

  if (params.syncPolicy === "if_empty" && !params.forceSync) {
    const existing = await queryPublicFixturesUncached({
      fromDateIso,
      toDateIso,
      limit: 250,
    });
    if (existing.fixtures.length > 0) {
      const nowMs = now.getTime();
      const activeLeagueIds = Array.from(
        new Set(
          existing.fixtures
            .filter((f) =>
              isFixtureInActiveWindow({
                fixtureStatus: f.fixtureStatus,
                kickoffAt: f.kickoffAt,
                nowMs,
              }),
            )
            .map((f) => f.leagueId),
        ),
      );
      if (activeLeagueIds.length > 0) {
        await refreshLiveFixturesForLeagueIds({
          leagueIds: activeLeagueIds,
          fromDateIso,
          toDateIso,
        });
        const refreshed = await queryPublicFixturesUncached({
          fromDateIso,
          toDateIso,
          limit: 250,
        });
        return {
          dateIso: params.dateIso,
          fixtures: refreshed.fixtures,
          leagues: refreshed.leagues,
          syncedAt: new Date().toISOString(),
        };
      }
      return {
        dateIso: params.dateIso,
        fixtures: existing.fixtures,
        leagues: existing.leagues,
        syncedAt: new Date().toISOString(),
      };
    }
  }

  if (params.forceSync || now.getTime() - lastSync > SYNC_TTL_MS) {
    recentDateSyncs.set(cacheKey, now.getTime());
    try {
      const provider = new EspnSoccerProvider();
      const providerMeta = {
        slug: provider.code,
        name: provider.name,
        baseUrl: "https://site.api.espn.com",
        dailyQuotaLimit: 5000,
        quotaReserve: 50,
      };

      const seasonYear = currentFootballSeasonYear(startDate);
      const syncResult = await withAppDb({ scope: "ai_pipeline" }, async (db) => {
        const providerRow = await ensureProviderAndLeagues(db, providerMeta);
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

        const [run] = await db
          .insert(ingestionRuns)
          .values({
            providerId: providerRow.id,
            jobName: "ingest-fixtures",
            status: "running",
          })
          .returning();

        let requestsMade = 0;
        let itemsUpserted = 0;

        for (let i = 0; i < trackedLeagues.length; i += 5) {
          const batch = trackedLeagues.slice(i, i + 5);
          const fetchedBatch = await Promise.all(
            batch.map(async (league) => {
              try {
                const res = await provider.fetchFixturesForDateRange({
                  leagueExternalId: league.externalId,
                  seasonYear,
                  fromDateIso,
                  toDateIso,
                });
                return { league, res };
              } catch {
                return { league, res: null };
              }
            }),
          );

          for (const { league, res } of fetchedBatch) {
            if (!res) continue;
            requestsMade += res.requestsMade;
            if (res.items.length === 0) continue;

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
            if (!season || !run) continue;

            itemsUpserted += await upsertNormalizedFixtures({
              db,
              providerId: providerRow.id,
              leagueId: league.id,
              seasonId: season.id,
              ingestionRunId: run.id,
              items: res.items,
            });
          }
        }

        if (run) {
          await db
            .update(ingestionRuns)
            .set({
              status: "completed",
              requestsMade,
              itemsUpserted,
              finishedAt: new Date(),
            })
            .where(eq(ingestionRuns.id, run.id));
        }

        // Check if any upcoming fixture on this date still lacks predictions (never compute for past kickoffs)
        const dayUpcoming = await db
          .select({ id: fixtures.id })
          .from(fixtures)
          .where(
            and(
              eq(fixtures.fixtureStatus, "scheduled"),
              gte(fixtures.kickoffAt, now),
              gte(fixtures.kickoffAt, startDate),
              lte(fixtures.kickoffAt, endDate),
            ),
          );

        let needsPredictionCompute = false;
        if (dayUpcoming.length > 0) {
          const existingPreds = await db
            .select({ fixtureId: predictions.fixtureId })
            .from(predictions)
            .where(
              inArray(
                predictions.fixtureId,
                dayUpcoming.map((f) => f.id),
              ),
            );
          const predSet = new Set(existingPreds.map((p) => p.fixtureId));
          needsPredictionCompute = dayUpcoming.some((f) => !predSet.has(f.id));
        }

        const dayFinished = await db
          .select({ id: fixtures.id })
          .from(fixtures)
          .where(
            and(
              inArray(fixtures.fixtureStatus, ["finished", "postponed", "cancelled", "abandoned"]),
              gte(fixtures.kickoffAt, startDate),
              lte(fixtures.kickoffAt, endDate),
            ),
          )
          .limit(1);

        return { needsPredictionCompute, hasFinished: dayFinished.length > 0 };
      });

      if (syncResult.needsPredictionCompute) {
        await runIngestStatsJob({ provider, dbScope: "ai_pipeline", invalidateCache: false });
        await runComputePredictionsJob({
          dbScope: "ai_pipeline",
          invalidateCache: false,
          syncCoupons: true,
        });
      }
      if (syncResult.hasFinished) {
        await runSettlePredictionsJob({ provider, dbScope: "ai_pipeline", invalidateCache: false });
      }
    } catch {
      // Fall back to persisted fixtures in DB if live sync hits a transient network issue
    }
  }

  const data = await queryPublicFixturesUncached({
    fromDateIso,
    toDateIso,
    limit: 250,
  });

  return {
    dateIso: params.dateIso,
    fixtures: data.fixtures,
    leagues: data.leagues,
    syncedAt: new Date().toISOString(),
  };
}
