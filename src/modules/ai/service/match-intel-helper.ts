import type {
  ExternalStandingRowDto,
  ExternalTeamStatsDto,
  MatchIntelligenceDto,
  SportsDataProvider,
  TeamKeyPlayerStat,
  TeamRecentMatchStat,
} from "@/modules/ai/providers/types";
import {
  summarizeRecentForm,
  upsertNormalizedFixtures,
} from "@/modules/ai/service/ingestion-helpers";
import type { AppDbTransaction } from "@/server/db/context";
import {
  fixtures,
  leagues,
  seasons,
  standings,
  teamStatsSnapshots,
  teams,
} from "@/server/db/schema";

export function formMetricsFromRecent(recent: TeamRecentMatchStat[]): {
  matches: number;
  points: number;
  formString: string;
} {
  let points = 0;
  for (const m of recent) {
    if (m.result === "W") points += 3;
    else if (m.result === "D") points += 1;
  }
  return { matches: recent.length, points, formString: recent.map((m) => m.result).join("") };
}

export async function collectMatchIntelligenceForUpcoming(params: {
  db: AppDbTransaction;
  provider: SportsDataProvider;
  providerId: string;
  runId: string;
  upcoming: Array<typeof fixtures.$inferSelect>;
  leagueById: Map<string, typeof leagues.$inferSelect>;
  seasonById: Map<string, typeof seasons.$inferSelect>;
  teamById: Map<string, typeof teams.$inferSelect>;
}) {
  const teamPlayersMap = new Map<string, TeamKeyPlayerStat[]>();
  const teamRecentMap = new Map<string, TeamRecentMatchStat[]>();
  let requestsMade = 0;
  let itemsUpserted = 0;

  if (!params.provider.fetchMatchIntelligence) {
    return { teamPlayersMap, teamRecentMap, requestsMade, itemsUpserted };
  }

  for (const fix of params.upcoming.slice(0, 20)) {
    const lRow = params.leagueById.get(fix.leagueId);
    const sRow = params.seasonById.get(fix.seasonId);
    const hTeam = params.teamById.get(fix.homeTeamId);
    const aTeam = params.teamById.get(fix.awayTeamId);
    if (!lRow || !sRow || !hTeam || !aTeam) continue;

    let intel: MatchIntelligenceDto | null = null;
    try {
      intel = await params.provider.fetchMatchIntelligence({
        leagueExternalId: lRow.externalId,
        fixtureExternalId: fix.externalId,
        seasonYear: sRow.year,
        homeTeamExternalId: hTeam.externalId,
        awayTeamExternalId: aTeam.externalId,
      });
      requestsMade += 1;
    } catch {
      intel = null;
    }
    if (!intel) continue;

    if (intel.homeKeyPlayers.length > 0) teamPlayersMap.set(hTeam.id, intel.homeKeyPlayers);
    if (intel.awayKeyPlayers.length > 0) teamPlayersMap.set(aTeam.id, intel.awayKeyPlayers);
    if (intel.homeRecentMatches.length > 0) teamRecentMap.set(hTeam.id, intel.homeRecentMatches);
    if (intel.awayRecentMatches.length > 0) teamRecentMap.set(aTeam.id, intel.awayRecentMatches);
    if (intel.headToHeadFixtures.length > 0) {
      itemsUpserted += await upsertNormalizedFixtures({
        db: params.db,
        providerId: params.providerId,
        leagueId: lRow.id,
        seasonId: sRow.id,
        ingestionRunId: params.runId,
        items: intel.headToHeadFixtures,
      });
    }
  }

  return { teamPlayersMap, teamRecentMap, requestsMade, itemsUpserted };
}

export async function upsertLeagueStandingsRows(params: {
  db: AppDbTransaction;
  leagueId: string;
  seasonId: string;
  runId: string;
  items: ExternalStandingRowDto[];
  extTeamMap: Map<string, string>;
  teamRecentMap: Map<string, TeamRecentMatchStat[]>;
}): Promise<number> {
  let count = 0;
  for (const row of params.items) {
    const tid = params.extTeamMap.get(row.teamExternalId);
    if (!tid) continue;
    const formStr =
      row.form ?? formMetricsFromRecent(params.teamRecentMap.get(tid) ?? []).formString;
    await params.db
      .insert(standings)
      .values({
        leagueId: params.leagueId,
        seasonId: params.seasonId,
        teamId: tid,
        ingestionRunId: params.runId,
        rank: row.rank,
        points: row.points,
        played: row.played,
        wins: row.won,
        draws: row.drawn,
        losses: row.lost,
        goalDiff: row.goalsDiff,
        formText: formStr,
      })
      .onConflictDoUpdate({
        target: [standings.leagueId, standings.seasonId, standings.teamId],
        set: {
          ingestionRunId: params.runId,
          rank: row.rank,
          points: row.points,
          played: row.played,
          wins: row.won,
          draws: row.drawn,
          losses: row.lost,
          goalDiff: row.goalsDiff,
          formText: formStr,
          updatedAt: new Date(),
        },
      });
    count += 1;
  }
  return count;
}

export async function upsertTeamSnapshotRow(params: {
  db: AppDbTransaction;
  teamId: string;
  leagueId: string;
  seasonId: string;
  runId: string;
  todayDate: string;
  stats: ExternalTeamStatsDto;
  keyPlayers: TeamKeyPlayerStat[];
  recentMatches: TeamRecentMatchStat[];
}): Promise<void> {
  const formSum =
    params.recentMatches.length > 0
      ? formMetricsFromRecent(params.recentMatches)
      : summarizeRecentForm(params.stats.recentForm);

  await params.db
    .insert(teamStatsSnapshots)
    .values({
      teamId: params.teamId,
      leagueId: params.leagueId,
      seasonId: params.seasonId,
      ingestionRunId: params.runId,
      asOfDate: params.todayDate,
      matchesPlayed: params.stats.matchesPlayed,
      homeMatchesPlayed: params.stats.homeMatches,
      awayMatchesPlayed: params.stats.awayMatches,
      goalsForTotal: params.stats.goalsFor,
      goalsAgainstTotal: params.stats.goalsAgainst,
      homeGoalsFor: params.stats.homeGoalsFor,
      homeGoalsAgainst: params.stats.homeGoalsAgainst,
      awayGoalsFor: params.stats.awayGoalsFor,
      awayGoalsAgainst: params.stats.awayGoalsAgainst,
      recentFormMatches: formSum.matches,
      recentFormPoints: formSum.points,
      keyPlayersJson: params.keyPlayers,
      recentMatchesJson: params.recentMatches,
      sourceTimestamp: new Date(),
    })
    .onConflictDoUpdate({
      target: [teamStatsSnapshots.teamId, teamStatsSnapshots.seasonId, teamStatsSnapshots.asOfDate],
      set: {
        ingestionRunId: params.runId,
        matchesPlayed: params.stats.matchesPlayed,
        goalsForTotal: params.stats.goalsFor,
        goalsAgainstTotal: params.stats.goalsAgainst,
        recentFormMatches: formSum.matches,
        recentFormPoints: formSum.points,
        keyPlayersJson: params.keyPlayers,
        recentMatchesJson: params.recentMatches,
        updatedAt: new Date(),
      },
    });
}
