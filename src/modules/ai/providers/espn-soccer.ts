import {
  buildEspnMatchIntelligence,
  espnScoreboardSchema,
  espnStandingsSchema,
  espnSummarySchema,
  mapEspnFixtureStatus,
  resolveEspnLeagueSlug,
} from "@/modules/ai/providers/espn-soccer-schemas";
import {
  externalFixtureSchema,
  externalStandingRowSchema,
  externalTeamStatsSchema,
  type ExternalFixtureDto,
  type ExternalStandingRowDto,
  type ExternalTeamStatsDto,
  type MatchIntelligenceDto,
  type ProviderFetchResult,
  type ProviderQuotaSnapshot,
  type SportsDataProvider,
} from "@/modules/ai/providers/types";

const FREE_QUOTA: ProviderQuotaSnapshot = { limit: 5000, remaining: 4990 };

export class EspnSoccerProvider implements SportsDataProvider {
  public readonly code = "espn-soccer";
  public readonly name = "ESPN Live Soccer Feeds";
  private readonly standingsCache = new Map<
    string,
    Map<string, ExternalStandingRowDto & { goalsFor: number; goalsAgainst: number }>
  >();

  public isConfigured(): boolean {
    return true;
  }

  private async fetchJson(url: string): Promise<unknown> {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`ESPN_HTTP_${response.status}`);
    }
    return response.json();
  }

  public async fetchUpcomingFixtures(params: {
    leagueExternalId: string;
    seasonYear: number;
    fromDateIso: string;
    toDateIso: string;
  }): Promise<ProviderFetchResult<ExternalFixtureDto>> {
    return this.fetchScoreboardFixtures(params, "upcoming");
  }

  public async fetchFinishedFixtures(params: {
    leagueExternalId: string;
    seasonYear: number;
    fromDateIso: string;
    toDateIso: string;
  }): Promise<ProviderFetchResult<ExternalFixtureDto>> {
    return this.fetchScoreboardFixtures(params, "finished");
  }

  private async fetchScoreboardFixtures(
    params: {
      leagueExternalId: string;
      seasonYear: number;
      fromDateIso: string;
      toDateIso: string;
    },
    mode: "upcoming" | "finished",
  ): Promise<ProviderFetchResult<ExternalFixtureDto>> {
    const slug = resolveEspnLeagueSlug(params.leagueExternalId);
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(slug)}/scoreboard`;
    const raw = await this.fetchJson(url);
    const parsed = espnScoreboardSchema.safeParse(raw);
    if (!parsed.success) {
      return { items: [], quota: FREE_QUOTA, rejectedCount: 1, requestsMade: 1 };
    }

    const items: ExternalFixtureDto[] = [];
    let rejectedCount = 0;

    for (const ev of parsed.data.events) {
      const comp = ev.competitions[0];
      if (!comp) continue;
      const home = comp.competitors.find((c) => c.homeAway === "home") ?? comp.competitors[0];
      const away = comp.competitors.find((c) => c.homeAway === "away") ?? comp.competitors[1];
      if (!home || !away) continue;

      const status = mapEspnFixtureStatus(
        comp.status?.type?.state,
        comp.status?.type?.name,
        comp.status?.type?.completed,
      );
      if (mode === "upcoming" && status !== "scheduled" && status !== "live") continue;
      if (mode === "finished" && status === "scheduled") continue;

      const homeScore =
        home.score !== undefined && /^\d+$/.test(home.score)
          ? Number.parseInt(home.score, 10)
          : null;
      const awayScore =
        away.score !== undefined && /^\d+$/.test(away.score)
          ? Number.parseInt(away.score, 10)
          : null;

      const dto = externalFixtureSchema.safeParse({
        externalId: String(ev.id),
        leagueExternalId: params.leagueExternalId,
        seasonYear: params.seasonYear,
        roundLabel: slug.toUpperCase(),
        kickoffAt: new Date(ev.date).toISOString(),
        venue: comp.venue?.fullName ?? null,
        status,
        homeGoals: homeScore,
        awayGoals: awayScore,
        homeTeam: {
          externalId: String(home.team.id),
          name: home.team.displayName ?? home.team.name ?? "Home",
          shortCode: home.team.abbreviation ?? null,
          logoUrl: home.team.logo ?? null,
        },
        awayTeam: {
          externalId: String(away.team.id),
          name: away.team.displayName ?? away.team.name ?? "Away",
          shortCode: away.team.abbreviation ?? null,
          logoUrl: away.team.logo ?? null,
        },
      });
      if (!dto.success) {
        rejectedCount += 1;
        continue;
      }
      items.push(dto.data);
    }

    return { items, quota: FREE_QUOTA, rejectedCount, requestsMade: 1 };
  }

  public async fetchStandings(params: {
    leagueExternalId: string;
    seasonYear: number;
  }): Promise<ProviderFetchResult<ExternalStandingRowDto>> {
    const slug = resolveEspnLeagueSlug(params.leagueExternalId);
    const url = `https://site.api.espn.com/apis/v2/sports/soccer/${encodeURIComponent(slug)}/standings`;
    let raw: unknown;
    try {
      raw = await this.fetchJson(url);
    } catch {
      return { items: [], quota: FREE_QUOTA, rejectedCount: 0, requestsMade: 1 };
    }
    const parsed = espnStandingsSchema.safeParse(raw);
    if (!parsed.success) {
      return { items: [], quota: FREE_QUOTA, rejectedCount: 1, requestsMade: 1 };
    }

    const entries = parsed.data.children[0]?.standings?.entries ?? [];
    const items: ExternalStandingRowDto[] = [];
    const cacheMap = new Map<
      string,
      ExternalStandingRowDto & { goalsFor: number; goalsAgainst: number }
    >();
    let rejectedCount = 0;

    for (const entry of entries) {
      const statVal = (name: string) =>
        Math.round(entry.stats.find((s) => s.name === name)?.value ?? 0);
      const teamExternalId = String(entry.team.id);
      const goalsFor = Math.max(0, statVal("pointsFor"));
      const goalsAgainst = Math.max(0, statVal("pointsAgainst"));
      const mapped = externalStandingRowSchema.safeParse({
        teamExternalId,
        teamName: entry.team.displayName ?? entry.team.name ?? "Team",
        rank: Math.max(1, statVal("rank")),
        points: Math.max(0, statVal("points")),
        played: Math.max(0, statVal("gamesPlayed")),
        won: Math.max(0, statVal("wins")),
        drawn: Math.max(0, statVal("ties")),
        lost: Math.max(0, statVal("losses")),
        goalsDiff: statVal("pointDifferential"),
        form: null,
      });
      if (!mapped.success) {
        rejectedCount += 1;
        continue;
      }
      items.push(mapped.data);
      cacheMap.set(teamExternalId, { ...mapped.data, goalsFor, goalsAgainst });
    }

    this.standingsCache.set(`${params.leagueExternalId}:${params.seasonYear}`, cacheMap);
    return { items, quota: FREE_QUOTA, rejectedCount, requestsMade: 1 };
  }

  public async fetchTeamStatistics(params: {
    leagueExternalId: string;
    seasonYear: number;
    teamExternalId: string;
  }): Promise<{
    stats: ExternalTeamStatsDto | null;
    quota: ProviderQuotaSnapshot;
    rejected: boolean;
    requestsMade: number;
  }> {
    const cacheKey = `${params.leagueExternalId}:${params.seasonYear}`;
    if (!this.standingsCache.has(cacheKey)) {
      await this.fetchStandings({
        leagueExternalId: params.leagueExternalId,
        seasonYear: params.seasonYear,
      });
    }
    const row = this.standingsCache.get(cacheKey)?.get(params.teamExternalId);
    if (!row) {
      return { stats: null, quota: FREE_QUOTA, rejected: false, requestsMade: 0 };
    }

    const mapped = externalTeamStatsSchema.safeParse({
      teamExternalId: row.teamExternalId,
      leagueExternalId: params.leagueExternalId,
      seasonYear: params.seasonYear,
      matchesPlayed: row.played,
      wins: row.won,
      draws: row.drawn,
      losses: row.lost,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      homeMatches: Math.floor(row.played / 2),
      homeGoalsFor: Math.ceil(row.goalsFor * 0.55),
      homeGoalsAgainst: Math.floor(row.goalsAgainst * 0.45),
      awayMatches: Math.ceil(row.played / 2),
      awayGoalsFor: Math.floor(row.goalsFor * 0.45),
      awayGoalsAgainst: Math.ceil(row.goalsAgainst * 0.55),
      recentForm: row.form,
    });

    if (!mapped.success) {
      return { stats: null, quota: FREE_QUOTA, rejected: true, requestsMade: 0 };
    }
    return { stats: mapped.data, quota: FREE_QUOTA, rejected: false, requestsMade: 0 };
  }

  public async fetchMatchIntelligence(params: {
    leagueExternalId: string;
    fixtureExternalId: string;
    seasonYear: number;
    homeTeamExternalId: string;
    awayTeamExternalId: string;
  }): Promise<MatchIntelligenceDto | null> {
    const slug = resolveEspnLeagueSlug(params.leagueExternalId);
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(slug)}/summary?event=${encodeURIComponent(params.fixtureExternalId)}`;
    const raw = await this.fetchJson(url);
    const parsed = espnSummarySchema.safeParse(raw);
    if (!parsed.success) return null;
    return buildEspnMatchIntelligence(parsed.data, params);
  }
}
