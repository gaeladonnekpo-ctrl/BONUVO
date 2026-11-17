import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { createSportsDataProvider } from "@/modules/ai/providers/api-football";
import type { SportsDataProvider } from "@/modules/ai/providers/types";
import {
  ensureDefaultProviderAndLeagues,
  summarizeRecentForm,
} from "@/modules/ai/service/ingestion-helpers";
import { resolveJobLockBackend } from "@/modules/intelligence/lock";
import { invalidatePublicCatalogTags } from "@/server/cache/catalog-tags";
import { withAppDb, type DbExecutionScope } from "@/server/db/context";
import {
  fixtures,
  ingestionRuns,
  leagues,
  seasons,
  standings,
  teamStatsSnapshots,
  teams,
} from "@/server/db/schema";

export async function runIngestStatsJob(options?: {
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
  const lockToken = await lock.acquire("ai:ingest-stats", 300);
  if (!lockToken) {
    return {
      ok: false as const,
      status: 409,
      code: "JOB_LOCKED",
      message: "Ingestion stats déjà en cours.",
    };
  }

  try {
    if (!provider.isConfigured()) {
      return {
        ok: true as const,
        configured: false,
        status: "skipped_unconfigured" as const,
        requestsMade: 0,
        itemsUpserted: 0,
      };
    }

    const now = new Date();
    const horizon = new Date(now.getTime() + 72 * 3600_000);
    const todayDate = now.toISOString().slice(0, 10);

    const summary = await withAppDb({ scope }, async (db) => {
      const providerRow = await ensureDefaultProviderAndLeagues(db);
      const [run] = await db
        .insert(ingestionRuns)
        .values({ providerId: providerRow.id, jobName: "ingest-stats", status: "running" })
        .returning();
      if (!run) throw new Error("RUN_INSERT_FAILED");

      let requestsMade = 0;
      let itemsUpserted = 0;
      let quotaRemaining: number | null = null;
      let stoppedByQuota = false;

      try {
        const upcoming = await db
          .select({
            leagueId: fixtures.leagueId,
            seasonId: fixtures.seasonId,
            homeTeamId: fixtures.homeTeamId,
            awayTeamId: fixtures.awayTeamId,
          })
          .from(fixtures)
          .where(
            and(
              eq(fixtures.fixtureStatus, "scheduled"),
              gte(fixtures.kickoffAt, now),
              lte(fixtures.kickoffAt, horizon),
            ),
          );

        const leagueIds = Array.from(new Set(upcoming.map((f) => f.leagueId)));
        const seasonIds = Array.from(new Set(upcoming.map((f) => f.seasonId)));
        const teamIds = Array.from(new Set(upcoming.flatMap((f) => [f.homeTeamId, f.awayTeamId])));

        if (leagueIds.length === 0 || teamIds.length === 0) {
          await db
            .update(ingestionRuns)
            .set({ status: "completed", requestsMade: 0, itemsUpserted: 0, finishedAt: new Date() })
            .where(eq(ingestionRuns.id, run.id));
          return {
            status: "completed" as const,
            requestsMade: 0,
            quotaRemaining: null,
            itemsUpserted: 0,
          };
        }

        const [leagueRows, seasonRows, teamRows] = await Promise.all([
          db.select().from(leagues).where(inArray(leagues.id, leagueIds)),
          db.select().from(seasons).where(inArray(seasons.id, seasonIds)),
          db.select().from(teams).where(inArray(teams.id, teamIds)),
        ]);

        const leagueById = new Map(leagueRows.map((l) => [l.id, l]));
        const seasonById = new Map(seasonRows.map((s) => [s.id, s]));
        const teamById = new Map(teamRows.map((t) => [t.id, t]));
        const extTeamMap = new Map(teamRows.map((t) => [t.externalId, t.id]));

        const seenLeagueSeasons = new Set<string>();
        for (const f of upcoming) {
          const lsKey = `${f.leagueId}:${f.seasonId}`;
          if (seenLeagueSeasons.has(lsKey)) continue;
          seenLeagueSeasons.add(lsKey);
          if (quotaRemaining !== null && quotaRemaining <= providerRow.quotaReserve) {
            stoppedByQuota = true;
            break;
          }
          const lRow = leagueById.get(f.leagueId);
          const sRow = seasonById.get(f.seasonId);
          if (!lRow || !sRow) continue;

          const standingRes = await provider.fetchStandings({
            leagueExternalId: lRow.externalId,
            seasonYear: sRow.year,
          });
          requestsMade += standingRes.requestsMade;
          if (standingRes.quota.remaining !== null) quotaRemaining = standingRes.quota.remaining;

          for (const row of standingRes.items) {
            const tid = extTeamMap.get(row.teamExternalId);
            if (!tid) continue;
            await db
              .insert(standings)
              .values({
                leagueId: lRow.id,
                seasonId: sRow.id,
                teamId: tid,
                ingestionRunId: run.id,
                rank: row.rank,
                points: row.points,
                played: row.played,
                wins: row.won,
                draws: row.drawn,
                losses: row.lost,
                goalDiff: row.goalsDiff,
                formText: row.form ?? "",
              })
              .onConflictDoUpdate({
                target: [standings.leagueId, standings.seasonId, standings.teamId],
                set: {
                  ingestionRunId: run.id,
                  rank: row.rank,
                  points: row.points,
                  played: row.played,
                  wins: row.won,
                  draws: row.drawn,
                  losses: row.lost,
                  goalDiff: row.goalsDiff,
                  formText: row.form ?? "",
                  updatedAt: new Date(),
                },
              });
            itemsUpserted += 1;
          }
        }

        const existingToday = await db
          .select({ teamId: teamStatsSnapshots.teamId, seasonId: teamStatsSnapshots.seasonId })
          .from(teamStatsSnapshots)
          .where(
            and(
              eq(teamStatsSnapshots.asOfDate, todayDate),
              inArray(teamStatsSnapshots.teamId, teamIds),
            ),
          );
        const existingSet = new Set(existingToday.map((r) => `${r.teamId}:${r.seasonId}`));

        const pairs = new Map<string, { leagueId: string; seasonId: string; teamId: string }>();
        for (const f of upcoming) {
          pairs.set(`${f.homeTeamId}:${f.seasonId}`, {
            leagueId: f.leagueId,
            seasonId: f.seasonId,
            teamId: f.homeTeamId,
          });
          pairs.set(`${f.awayTeamId}:${f.seasonId}`, {
            leagueId: f.leagueId,
            seasonId: f.seasonId,
            teamId: f.awayTeamId,
          });
        }

        for (const pair of pairs.values()) {
          if (existingSet.has(`${pair.teamId}:${pair.seasonId}`)) continue;
          if (quotaRemaining !== null && quotaRemaining <= providerRow.quotaReserve) {
            stoppedByQuota = true;
            break;
          }
          const lRow = leagueById.get(pair.leagueId);
          const sRow = seasonById.get(pair.seasonId);
          const tRow = teamById.get(pair.teamId);
          if (!lRow || !sRow || !tRow) continue;

          const statRes = await provider.fetchTeamStatistics({
            leagueExternalId: lRow.externalId,
            seasonYear: sRow.year,
            teamExternalId: tRow.externalId,
          });
          requestsMade += statRes.requestsMade;
          if (statRes.quota.remaining !== null) quotaRemaining = statRes.quota.remaining;
          if (!statRes.stats) continue;

          const formSum = summarizeRecentForm(statRes.stats.recentForm);
          await db
            .insert(teamStatsSnapshots)
            .values({
              teamId: tRow.id,
              leagueId: lRow.id,
              seasonId: sRow.id,
              ingestionRunId: run.id,
              asOfDate: todayDate,
              matchesPlayed: statRes.stats.matchesPlayed,
              homeMatchesPlayed: statRes.stats.homeMatches,
              awayMatchesPlayed: statRes.stats.awayMatches,
              goalsForTotal: statRes.stats.goalsFor,
              goalsAgainstTotal: statRes.stats.goalsAgainst,
              homeGoalsFor: statRes.stats.homeGoalsFor,
              homeGoalsAgainst: statRes.stats.homeGoalsAgainst,
              awayGoalsFor: statRes.stats.awayGoalsFor,
              awayGoalsAgainst: statRes.stats.awayGoalsAgainst,
              recentFormMatches: formSum.matches,
              recentFormPoints: formSum.points,
              sourceTimestamp: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                teamStatsSnapshots.teamId,
                teamStatsSnapshots.seasonId,
                teamStatsSnapshots.asOfDate,
              ],
              set: {
                ingestionRunId: run.id,
                matchesPlayed: statRes.stats.matchesPlayed,
                goalsForTotal: statRes.stats.goalsFor,
                goalsAgainstTotal: statRes.stats.goalsAgainst,
                recentFormMatches: formSum.matches,
                recentFormPoints: formSum.points,
                updatedAt: new Date(),
              },
            });
          itemsUpserted += 1;
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
        const message = err instanceof Error ? err.message.slice(0, 240) : "STATS_INGEST_ERROR";
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
    await lock.release("ai:ingest-stats", lockToken);
  }
}
