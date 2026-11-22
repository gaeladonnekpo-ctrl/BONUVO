import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { settlePrediction } from "@/modules/ai/model/settle";
import { reconcilePendingCoupons } from "@/modules/ai/service/coupon-sync-service";
import { createActiveSportsDataProvider } from "@/modules/ai/providers/registry";
import type { SportsDataProvider } from "@/modules/ai/providers/types";
import {
  currentFootballSeasonYear,
  ensureProviderAndLeagues,
  upsertNormalizedFixtures,
} from "@/modules/ai/service/ingestion-helpers";
import { resolveJobLockBackend } from "@/modules/intelligence/lock";
import { invalidatePublicCatalogTags } from "@/server/cache/catalog-tags";
import { withAppDb, type DbExecutionScope } from "@/server/db/context";
import {
  fixtures,
  ingestionRuns,
  leagues,
  predictionResults,
  predictions,
  seasons,
} from "@/server/db/schema";

export async function runSettlePredictionsJob(options?: {
  provider?: SportsDataProvider;
  dbScope?: DbExecutionScope;
  invalidateCache?: boolean;
}) {
  const provider = options?.provider ?? createActiveSportsDataProvider();
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
  const lockToken = await lock.acquire("ai:settle-predictions", 300);
  if (!lockToken) {
    return {
      ok: false as const,
      status: 409,
      code: "JOB_LOCKED",
      message: "Règlement déjà en cours.",
    };
  }

  try {
    const now = new Date();
    const summary = await withAppDb({ scope }, async (db) => {
      const providerRow = await ensureProviderAndLeagues(db, {
        slug: provider.code,
        name: provider.name,
        baseUrl:
          provider.code === "espn-soccer"
            ? "https://site.api.espn.com"
            : "https://v3.football.api-sports.io",
        dailyQuotaLimit: provider.code === "espn-soccer" ? 5000 : 100,
        quotaReserve: provider.code === "espn-soccer" ? 50 : 10,
      });
      let refreshRunId: string | null = null;

      if (provider.isConfigured()) {
        const cutoff = new Date(now.getTime() - 2 * 3600_000);
        const pendingFixtures = await db
          .select({ leagueId: fixtures.leagueId, seasonId: fixtures.seasonId })
          .from(fixtures)
          .where(
            and(
              inArray(fixtures.fixtureStatus, ["scheduled", "live"]),
              lte(fixtures.kickoffAt, cutoff),
            ),
          )
          .limit(10);

        if (pendingFixtures.length > 0) {
          const [run] = await db
            .insert(ingestionRuns)
            .values({
              providerId: providerRow.id,
              jobName: "settle-predictions",
              status: "running",
            })
            .returning();
          if (run) {
            refreshRunId = run.id;
            let requestsMade = 0;
            let itemsUpserted = 0;
            let quotaRemaining: number | null = null;
            const leagueIds = Array.from(new Set(pendingFixtures.map((f) => f.leagueId)));
            const leagueRows = await db
              .select()
              .from(leagues)
              .where(inArray(leagues.id, leagueIds));
            const seasonYear = currentFootballSeasonYear(now);
            const fromIso = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();
            const toIso = now.toISOString();

            for (const leagueRow of leagueRows) {
              if (quotaRemaining !== null && quotaRemaining <= providerRow.quotaReserve) break;
              const [season] = await db
                .insert(seasons)
                .values({
                  providerId: providerRow.id,
                  leagueId: leagueRow.id,
                  year: seasonYear,
                  isCurrent: true,
                })
                .onConflictDoUpdate({
                  target: [seasons.leagueId, seasons.year],
                  set: { isCurrent: true },
                })
                .returning();
              if (!season) continue;

              const finishedRes = await provider.fetchFinishedFixtures({
                leagueExternalId: leagueRow.externalId,
                seasonYear: season.year,
                fromDateIso: fromIso,
                toDateIso: toIso,
              });
              requestsMade += finishedRes.requestsMade;
              if (finishedRes.quota.remaining !== null)
                quotaRemaining = finishedRes.quota.remaining;
              itemsUpserted += await upsertNormalizedFixtures({
                db,
                providerId: providerRow.id,
                leagueId: leagueRow.id,
                seasonId: season.id,
                ingestionRunId: run.id,
                items: finishedRes.items,
              });
            }

            await db
              .update(ingestionRuns)
              .set({
                status: "completed",
                requestsMade,
                quotaRemaining,
                itemsUpserted,
                finishedAt: new Date(),
              })
              .where(eq(ingestionRuns.id, run.id));
          }
        }
      }

      const unsettled = await db
        .select({
          predictionId: predictions.id,
          fixtureId: fixtures.id,
          fixtureStatus: fixtures.fixtureStatus,
          homeGoals: fixtures.homeGoals,
          awayGoals: fixtures.awayGoals,
          market: predictions.market,
          pickedSelection: predictions.pickedSelection,
          probabilitiesJson: predictions.probabilitiesJson,
        })
        .from(predictions)
        .innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
        .leftJoin(predictionResults, eq(predictionResults.predictionId, predictions.id))
        .where(
          and(
            isNull(predictionResults.id),
            inArray(fixtures.fixtureStatus, ["finished", "postponed", "cancelled", "abandoned"]),
          ),
        );

      let settledCount = 0;
      let wonCount = 0;
      let lostCount = 0;
      let voidCount = 0;

      for (const row of unsettled) {
        const evalResult = settlePrediction({
          fixtureStatus: row.fixtureStatus,
          homeGoals: row.homeGoals,
          awayGoals: row.awayGoals,
          market: row.market,
          recommendedPick: row.pickedSelection,
          probabilities: row.probabilitiesJson,
        });
        if (!evalResult) continue;

        await db
          .insert(predictionResults)
          .values({
            predictionId: row.predictionId,
            fixtureId: row.fixtureId,
            actualOutcome: evalResult.actualOutcome,
            verdict: evalResult.verdict,
            brierScore: evalResult.brierScore !== null ? evalResult.brierScore.toFixed(4) : null,
            settledAt: new Date(),
            ingestionRunId: refreshRunId,
          })
          .onConflictDoNothing();

        settledCount += 1;
        if (evalResult.verdict === "won") wonCount += 1;
        else if (evalResult.verdict === "lost") lostCount += 1;
        else voidCount += 1;
      }

      // Re-verify recently settled predictions (last 7 days) in case an official score or status was corrected
      const recheckCutoff = new Date(now.getTime() - 7 * 24 * 3600_000);
      const recentlySettled = await db
        .select({
          resultId: predictionResults.id,
          currentVerdict: predictionResults.verdict,
          currentActualOutcome: predictionResults.actualOutcome,
          fixtureStatus: fixtures.fixtureStatus,
          homeGoals: fixtures.homeGoals,
          awayGoals: fixtures.awayGoals,
          market: predictions.market,
          pickedSelection: predictions.pickedSelection,
          probabilitiesJson: predictions.probabilitiesJson,
        })
        .from(predictionResults)
        .innerJoin(predictions, eq(predictionResults.predictionId, predictions.id))
        .innerJoin(fixtures, eq(predictionResults.fixtureId, fixtures.id))
        .where(gte(predictionResults.settledAt, recheckCutoff));

      let correctedCount = 0;
      for (const row of recentlySettled) {
        const evalResult = settlePrediction({
          fixtureStatus: row.fixtureStatus,
          homeGoals: row.homeGoals,
          awayGoals: row.awayGoals,
          market: row.market,
          recommendedPick: row.pickedSelection,
          probabilities: row.probabilitiesJson,
        });
        if (!evalResult) continue;
        if (
          evalResult.verdict === row.currentVerdict &&
          evalResult.actualOutcome === row.currentActualOutcome
        ) {
          continue;
        }
        await db
          .update(predictionResults)
          .set({
            actualOutcome: evalResult.actualOutcome,
            verdict: evalResult.verdict,
            brierScore: evalResult.brierScore !== null ? evalResult.brierScore.toFixed(4) : null,
            settledAt: now,
            ingestionRunId: refreshRunId,
          })
          .where(eq(predictionResults.id, row.resultId));
        correctedCount += 1;
      }

      const couponStats = await reconcilePendingCoupons(db, now);

      return { settledCount, wonCount, lostCount, voidCount, correctedCount, ...couponStats };
    });

    if (options?.invalidateCache !== false) {
      invalidatePublicCatalogTags(["predictions", "community"]);
    }
    return { ok: true as const, ...summary };
  } finally {
    await lock.release("ai:settle-predictions", lockToken);
  }
}
