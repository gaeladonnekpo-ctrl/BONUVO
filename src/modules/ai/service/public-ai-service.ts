import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import {
  humanizeAnalysisText,
  resolveDefaultLeagueLogo,
} from "@/modules/ai/service/ingestion-helpers";
import { enrichKeyPlayersWithOfficialPhotos } from "@/modules/ai/service/player-photo-resolver";
import { getPublicPredictionStats } from "@/modules/ai/service/public-ai-stats";
import type {
  LeagueFilterOption,
  PublicFixtureDto,
  PublicPredictionCardDto,
} from "@/modules/ai/service/public-ai-types";
import { PUBLIC_CATALOG_CACHE_TAGS, withCatalogCache } from "@/server/cache/catalog-tags";
import { withAppDb } from "@/server/db/context";
import {
  fixtures,
  ingestionRuns,
  leagues,
  predictionResults,
  predictions,
  sportsProviders,
  standings,
  teamStatsSnapshots,
  teams,
} from "@/server/db/schema";

export { getPublicPredictionStats };
export type { LeagueFilterOption, PublicFixtureDto, PublicPredictionCardDto };

function mapPredictionCard(
  p: typeof predictions.$inferSelect,
  r: typeof predictionResults.$inferSelect | undefined,
): PublicPredictionCardDto {
  return {
    id: p.id,
    market: p.market,
    pickedSelection: p.pickedSelection,
    confidenceLevel: p.confidenceLevel,
    confidenceScore: Number(p.confidenceScore),
    probabilities: p.probabilitiesJson,
    expectedHomeGoals: Number(p.expectedHomeGoals),
    expectedAwayGoals: Number(p.expectedAwayGoals),
    analysisText: humanizeAnalysisText(p.analysisText),
    analysisStatus: p.analysisStatus,
    couponValidated: p.couponValidated,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    lockedAt: p.lockedAt ? p.lockedAt.toISOString() : null,
    verdict: r?.verdict ?? (p.status === "void" ? "void" : null),
    brierScore: r?.brierScore !== null && r?.brierScore !== undefined ? Number(r.brierScore) : null,
    actualOutcome: r?.actualOutcome ?? null,
    settledAt: r?.settledAt ? r.settledAt.toISOString() : null,
  };
}

async function queryPublicFixturesUncached(filter?: {
  leagueId?: string;
  upcomingOnly?: boolean;
  settledOnly?: boolean;
  limit?: number;
}): Promise<{ fixtures: PublicFixtureDto[]; leagues: LeagueFilterOption[] }> {
  return withAppDb({ scope: "public_catalog" }, async (db) => {
    const now = new Date();
    const minKickoff = new Date(now.getTime() - 45 * 24 * 3600_000);
    const maxKickoff = new Date(now.getTime() + 14 * 24 * 3600_000);

    const rawLeagues = await db
      .select({
        id: leagues.id,
        externalId: leagues.externalId,
        name: leagues.name,
        countryName: leagues.countryName,
        logoUrl: leagues.logoUrl,
        priorityOrder: leagues.priorityOrder,
      })
      .from(leagues)
      .where(and(eq(leagues.active, true), eq(leagues.tracked, true)))
      .orderBy(leagues.priorityOrder);

    const conditions = [gte(fixtures.kickoffAt, minKickoff), lte(fixtures.kickoffAt, maxKickoff)];
    if (filter?.leagueId) conditions.push(eq(fixtures.leagueId, filter.leagueId));
    if (filter?.upcomingOnly) {
      conditions.push(eq(fixtures.fixtureStatus, "scheduled"));
      conditions.push(gte(fixtures.kickoffAt, now));
    }
    if (filter?.settledOnly) {
      conditions.push(
        inArray(fixtures.fixtureStatus, ["finished", "postponed", "cancelled", "abandoned"]),
      );
    }

    const fixRows = await db
      .select()
      .from(fixtures)
      .where(and(...conditions))
      .orderBy(filter?.settledOnly ? desc(fixtures.kickoffAt) : fixtures.kickoffAt)
      .limit(filter?.limit ?? 40);

    const activeLeagueIds = new Set(fixRows.map((f) => f.leagueId));
    const dedupedLeaguesMap = new Map<string, LeagueFilterOption>();
    for (const l of rawLeagues) {
      const key = l.name.toLowerCase();
      const existing = dedupedLeaguesMap.get(key);
      if (!existing || activeLeagueIds.has(l.id)) {
        dedupedLeaguesMap.set(key, {
          id: l.id,
          externalId: l.externalId,
          name: l.name,
          countryName: l.countryName,
          logoUrl: l.logoUrl || resolveDefaultLeagueLogo(l.externalId, l.name),
        });
      }
    }
    const trackedLeagues = Array.from(dedupedLeaguesMap.values());

    if (fixRows.length === 0) return { fixtures: [], leagues: trackedLeagues };

    const fixtureIds = fixRows.map((f) => f.id);
    const teamIds = Array.from(new Set(fixRows.flatMap((f) => [f.homeTeamId, f.awayTeamId])));
    const leagueIds = Array.from(new Set(fixRows.map((f) => f.leagueId)));

    const [teamRows, leagueRows, predRows, resultRows, providerRows, runRows] = await Promise.all([
      db.select().from(teams).where(inArray(teams.id, teamIds)),
      db.select().from(leagues).where(inArray(leagues.id, leagueIds)),
      db
        .select()
        .from(predictions)
        .where(
          and(
            inArray(predictions.fixtureId, fixtureIds),
            inArray(predictions.status, ["published", "void"]),
          ),
        ),
      db.select().from(predictionResults).where(inArray(predictionResults.fixtureId, fixtureIds)),
      db.select({ id: sportsProviders.id, name: sportsProviders.name }).from(sportsProviders),
      db
        .select({
          providerId: ingestionRuns.providerId,
          finishedAt: ingestionRuns.finishedAt,
          startedAt: ingestionRuns.startedAt,
        })
        .from(ingestionRuns)
        .where(eq(ingestionRuns.status, "completed"))
        .orderBy(desc(ingestionRuns.startedAt))
        .limit(20),
    ]);

    const providerMap = new Map(providerRows.map((p) => [p.id, p.name]));
    const latestRunByProvider = new Map<string, Date>();
    for (const run of runRows) {
      if (!latestRunByProvider.has(run.providerId)) {
        latestRunByProvider.set(run.providerId, run.finishedAt ?? run.startedAt);
      }
    }
    const teamMap = new Map(teamRows.map((t) => [t.id, t]));
    const leagueMap = new Map(leagueRows.map((l) => [l.id, l]));
    const resultByPred = new Map(resultRows.map((r) => [r.predictionId, r]));
    const predsByFixture = new Map<string, PublicPredictionCardDto[]>();

    for (const p of predRows) {
      const list = predsByFixture.get(p.fixtureId) ?? [];
      list.push(mapPredictionCard(p, resultByPred.get(p.id)));
      predsByFixture.set(p.fixtureId, list);
    }

    const mapped = fixRows.map((f): PublicFixtureDto => {
      const l = leagueMap.get(f.leagueId);
      const lName = l?.name ?? "Football";
      const providerName = providerMap.get(f.providerId) ?? "Sports Data";
      const lastIngest = latestRunByProvider.get(f.providerId) ?? f.updatedAt;
      return {
        id: f.id,
        leagueId: f.leagueId,
        leagueName: lName,
        leagueLogo: l?.logoUrl || resolveDefaultLeagueLogo(l?.externalId ?? "", lName),
        countryName: l?.countryName ?? "",
        kickoffAt: f.kickoffAt.toISOString(),
        venueName: f.venueName,
        roundLabel: f.roundLabel,
        fixtureStatus: f.fixtureStatus,
        homeTeamId: f.homeTeamId,
        homeTeamName: teamMap.get(f.homeTeamId)?.name ?? "Home",
        homeTeamLogo: teamMap.get(f.homeTeamId)?.logoUrl ?? "",
        awayTeamId: f.awayTeamId,
        awayTeamName: teamMap.get(f.awayTeamId)?.name ?? "Away",
        awayTeamLogo: teamMap.get(f.awayTeamId)?.logoUrl ?? "",
        homeGoals: f.homeGoals,
        awayGoals: f.awayGoals,
        providerName,
        lastIngestedAt: lastIngest ? lastIngest.toISOString() : null,
        predictions: predsByFixture.get(f.id) ?? [],
      };
    });

    return { fixtures: mapped, leagues: trackedLeagues };
  });
}

export async function listPublicFixtures(filter?: {
  leagueId?: string;
  upcomingOnly?: boolean;
  settledOnly?: boolean;
  limit?: number;
}) {
  const key = [
    "ai-fixtures-v2",
    filter?.leagueId ?? "all",
    filter?.upcomingOnly ? "up" : "any",
    filter?.settledOnly ? "settled" : "all",
    String(filter?.limit ?? 40),
  ];
  return withCatalogCache(() => queryPublicFixturesUncached(filter), key, [
    PUBLIC_CATALOG_CACHE_TAGS.predictions,
  ])();
}

export async function getPublicFixtureDetail(fixtureId: string) {
  return withCatalogCache(
    async () =>
      withAppDb({ scope: "public_catalog" }, async (db) => {
        const [fix] = await db.select().from(fixtures).where(eq(fixtures.id, fixtureId)).limit(1);
        if (!fix) return null;
        const pairIds = [fix.homeTeamId, fix.awayTeamId];

        const [leagueRows, teamRows, predRows, resRows, statsRows, standingRows, h2hRows] =
          await Promise.all([
            db.select().from(leagues).where(eq(leagues.id, fix.leagueId)).limit(1),
            db.select().from(teams).where(inArray(teams.id, pairIds)),
            db
              .select()
              .from(predictions)
              .where(
                and(
                  eq(predictions.fixtureId, fix.id),
                  inArray(predictions.status, ["published", "void"]),
                ),
              ),
            db.select().from(predictionResults).where(eq(predictionResults.fixtureId, fix.id)),
            db
              .select()
              .from(teamStatsSnapshots)
              .where(
                and(
                  eq(teamStatsSnapshots.seasonId, fix.seasonId),
                  inArray(teamStatsSnapshots.teamId, pairIds),
                ),
              )
              .orderBy(desc(teamStatsSnapshots.asOfDate)),
            db
              .select()
              .from(standings)
              .where(and(eq(standings.seasonId, fix.seasonId), inArray(standings.teamId, pairIds))),
            db
              .select()
              .from(fixtures)
              .where(
                and(
                  eq(fixtures.fixtureStatus, "finished"),
                  inArray(fixtures.homeTeamId, pairIds),
                  inArray(fixtures.awayTeamId, pairIds),
                ),
              )
              .orderBy(desc(fixtures.kickoffAt))
              .limit(6),
          ]);

        const teamMap = new Map(teamRows.map((t) => [t.id, t]));
        const resByPred = new Map(resRows.map((r) => [r.predictionId, r]));
        const latestStats = new Map<string, (typeof statsRows)[number]>();
        for (const s of statsRows) if (!latestStats.has(s.teamId)) latestStats.set(s.teamId, s);
        const standingMap = new Map(standingRows.map((st) => [st.teamId, st]));
        const lRow = leagueRows[0];
        const lName = lRow?.name ?? "Football";

        const [provRow] = await db
          .select({ name: sportsProviders.name })
          .from(sportsProviders)
          .where(eq(sportsProviders.id, fix.providerId))
          .limit(1);
        const [latestRun] = await db
          .select({ finishedAt: ingestionRuns.finishedAt, startedAt: ingestionRuns.startedAt })
          .from(ingestionRuns)
          .where(
            and(
              eq(ingestionRuns.providerId, fix.providerId),
              eq(ingestionRuns.status, "completed"),
            ),
          )
          .orderBy(desc(ingestionRuns.startedAt))
          .limit(1);

        const lastIngest = latestRun?.finishedAt ?? latestRun?.startedAt ?? fix.updatedAt;

        const rawHomeStats = latestStats.get(fix.homeTeamId) ?? null;
        const rawAwayStats = latestStats.get(fix.awayTeamId) ?? null;
        const homeTeamExtId = teamMap.get(fix.homeTeamId)?.externalId ?? "";
        const awayTeamExtId = teamMap.get(fix.awayTeamId)?.externalId ?? "";

        const [enrichedHomePlayers, enrichedAwayPlayers] = await Promise.all([
          rawHomeStats?.keyPlayersJson?.length
            ? enrichKeyPlayersWithOfficialPhotos({
                players: rawHomeStats.keyPlayersJson,
                leagueExternalId: lRow?.externalId ?? "",
                leagueName: lName,
                teamExternalId: homeTeamExtId,
                teamName: teamMap.get(fix.homeTeamId)?.name ?? "",
              })
            : Promise.resolve([]),
          rawAwayStats?.keyPlayersJson?.length
            ? enrichKeyPlayersWithOfficialPhotos({
                players: rawAwayStats.keyPlayersJson,
                leagueExternalId: lRow?.externalId ?? "",
                leagueName: lName,
                teamExternalId: awayTeamExtId,
                teamName: teamMap.get(fix.awayTeamId)?.name ?? "",
              })
            : Promise.resolve([]),
        ]);

        const homeStats = rawHomeStats
          ? { ...rawHomeStats, keyPlayersJson: enrichedHomePlayers }
          : null;
        const awayStats = rawAwayStats
          ? { ...rawAwayStats, keyPlayersJson: enrichedAwayPlayers }
          : null;

        return {
          fixture: {
            id: fix.id,
            leagueId: fix.leagueId,
            leagueName: lName,
            leagueLogo: lRow?.logoUrl || resolveDefaultLeagueLogo(lRow?.externalId ?? "", lName),
            countryName: lRow?.countryName ?? "",
            kickoffAt: fix.kickoffAt.toISOString(),
            venueName: fix.venueName,
            roundLabel: fix.roundLabel,
            fixtureStatus: fix.fixtureStatus,
            providerName: provRow?.name ?? "Sports Data",
            lastIngestedAt: lastIngest ? lastIngest.toISOString() : null,
            homeTeamId: fix.homeTeamId,
            homeTeamName: teamMap.get(fix.homeTeamId)?.name ?? "Home",
            homeTeamLogo: teamMap.get(fix.homeTeamId)?.logoUrl ?? "",
            awayTeamId: fix.awayTeamId,
            awayTeamName: teamMap.get(fix.awayTeamId)?.name ?? "Away",
            awayTeamLogo: teamMap.get(fix.awayTeamId)?.logoUrl ?? "",
            homeGoals: fix.homeGoals,
            awayGoals: fix.awayGoals,
            predictions: predRows.map((p) => mapPredictionCard(p, resByPred.get(p.id))),
          },
          homeStats,
          awayStats,
          homeStanding: standingMap.get(fix.homeTeamId) ?? null,
          awayStanding: standingMap.get(fix.awayTeamId) ?? null,
          headToHead: h2hRows.map((h) => ({
            id: h.id,
            kickoffAt: h.kickoffAt.toISOString(),
            homeTeamName: teamMap.get(h.homeTeamId)?.name ?? "Home",
            homeTeamLogo: teamMap.get(h.homeTeamId)?.logoUrl ?? "",
            awayTeamName: teamMap.get(h.awayTeamId)?.name ?? "Away",
            awayTeamLogo: teamMap.get(h.awayTeamId)?.logoUrl ?? "",
            homeGoals: h.homeGoals,
            awayGoals: h.awayGoals,
          })),
        };
      }),
    ["ai-fixture-detail-v4", fixtureId],
    [PUBLIC_CATALOG_CACHE_TAGS.predictions],
  )();
}
