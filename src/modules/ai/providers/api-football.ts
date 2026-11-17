import { z } from "zod";
import { getServerEnv } from "@/server/env";
import {
  mapFixtureStatus,
  parseQuotaHeaders,
  rawApiFixtureItemSchema,
  rawApiStandingsSchema,
  rawApiStatsResponseSchema,
} from "@/modules/ai/providers/api-football-schemas";
import {
  externalFixtureSchema,
  externalStandingRowSchema,
  externalTeamStatsSchema,
  type ExternalFixtureDto,
  type ExternalStandingRowDto,
  type ExternalTeamStatsDto,
  type ProviderFetchResult,
  type ProviderQuotaSnapshot,
  type SportsDataProvider,
} from "@/modules/ai/providers/types";

export class ApiFootballProvider implements SportsDataProvider {
  public readonly code = "api-football";
  public readonly name = "API-Football v3";
  private readonly overrideKey?: string;
  private readonly overrideHost?: string;

  constructor(options?: { apiKey?: string; host?: string }) {
    this.overrideKey = options?.apiKey?.trim() || undefined;
    this.overrideHost = options?.host?.trim() || undefined;
  }

  private getCredentials(): { apiKey: string; host: string } | null {
    if (this.overrideKey) {
      const host = (this.overrideHost || "v3.football.api-sports.io").replace(/^https?:\/\//i, "");
      return { apiKey: this.overrideKey, host };
    }
    const env = getServerEnv();
    const apiKey = env.API_FOOTBALL_KEY?.trim();
    if (!apiKey) return null;
    const host = (env.API_FOOTBALL_HOST?.trim() || "v3.football.api-sports.io").replace(
      /^https?:\/\//i,
      "",
    );
    return { apiKey, host };
  }

  public isConfigured(): boolean {
    return this.getCredentials() !== null;
  }

  private async requestJson(
    path: string,
    query: Record<string, string | number>,
  ): Promise<{ json: unknown; quota: ProviderQuotaSnapshot }> {
    const creds = this.getCredentials();
    if (!creds) throw new Error("PROVIDER_NOT_CONFIGURED");

    const url = new URL(`https://${creds.host}${path}`);
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, String(v));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { "x-apisports-key": creds.apiKey, Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });
      const quota = parseQuotaHeaders(response.headers);
      if (response.status === 429) throw new Error("PROVIDER_QUOTA_EXCEEDED");
      if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
      return { json: await response.json(), quota };
    } finally {
      clearTimeout(timer);
    }
  }

  public async fetchUpcomingFixtures(params: {
    leagueExternalId: string;
    seasonYear: number;
    fromDateIso: string;
    toDateIso: string;
  }): Promise<ProviderFetchResult<ExternalFixtureDto>> {
    return this.fetchFixturesRange(params, "NS");
  }

  public async fetchFinishedFixtures(params: {
    leagueExternalId: string;
    seasonYear: number;
    fromDateIso: string;
    toDateIso: string;
  }): Promise<ProviderFetchResult<ExternalFixtureDto>> {
    return this.fetchFixturesRange(params, "FT");
  }

  private async fetchFixturesRange(
    params: {
      leagueExternalId: string;
      seasonYear: number;
      fromDateIso: string;
      toDateIso: string;
    },
    statusFilter?: string,
  ): Promise<ProviderFetchResult<ExternalFixtureDto>> {
    const { json, quota } = await this.requestJson("/fixtures", {
      league: params.leagueExternalId,
      season: params.seasonYear,
      from: params.fromDateIso.slice(0, 10),
      to: params.toDateIso.slice(0, 10),
      ...(statusFilter ? { status: statusFilter } : {}),
    });

    const envelope = z.object({ response: z.array(z.unknown()) }).safeParse(json);
    if (!envelope.success) return { items: [], quota, rejectedCount: 1, requestsMade: 1 };

    const items: ExternalFixtureDto[] = [];
    let rejectedCount = 0;
    for (const rawItem of envelope.data.response) {
      const parsedRaw = rawApiFixtureItemSchema.safeParse(rawItem);
      if (!parsedRaw.success) {
        rejectedCount += 1;
        continue;
      }
      const r = parsedRaw.data;
      const mapped = externalFixtureSchema.safeParse({
        externalId: String(r.fixture.id),
        leagueExternalId: String(r.league.id),
        seasonYear: r.league.season,
        roundLabel: r.league.round ?? null,
        kickoffAt: new Date(r.fixture.date).toISOString(),
        venue: r.fixture.venue?.name ?? null,
        status: mapFixtureStatus(r.fixture.status.short),
        homeGoals: r.goals.home ?? null,
        awayGoals: r.goals.away ?? null,
        homeTeam: {
          externalId: String(r.teams.home.id),
          name: r.teams.home.name,
          logoUrl: r.teams.home.logo ?? null,
        },
        awayTeam: {
          externalId: String(r.teams.away.id),
          name: r.teams.away.name,
          logoUrl: r.teams.away.logo ?? null,
        },
      });
      if (!mapped.success) {
        rejectedCount += 1;
        continue;
      }
      items.push(mapped.data);
    }

    return { items, quota, rejectedCount, requestsMade: 1 };
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
    const { json, quota } = await this.requestJson("/teams/statistics", {
      league: params.leagueExternalId,
      season: params.seasonYear,
      team: params.teamExternalId,
    });

    const parsedRaw = rawApiStatsResponseSchema.safeParse(json);
    if (!parsedRaw.success) return { stats: null, quota, rejected: true, requestsMade: 1 };

    const r = parsedRaw.data.response;
    const mapped = externalTeamStatsSchema.safeParse({
      teamExternalId: String(r.team.id),
      leagueExternalId: String(r.league.id),
      seasonYear: r.league.season,
      matchesPlayed: r.fixtures.played.total ?? 0,
      wins: r.fixtures.wins.total ?? 0,
      draws: r.fixtures.draws.total ?? 0,
      losses: r.fixtures.loses.total ?? 0,
      goalsFor: r.goals.for.total.total ?? 0,
      goalsAgainst: r.goals.against.total.total ?? 0,
      homeMatches: r.fixtures.played.home ?? 0,
      homeGoalsFor: r.goals.for.total.home ?? 0,
      homeGoalsAgainst: r.goals.against.total.home ?? 0,
      awayMatches: r.fixtures.played.away ?? 0,
      awayGoalsFor: r.goals.for.total.away ?? 0,
      awayGoalsAgainst: r.goals.against.total.away ?? 0,
      cleanSheets: r.clean_sheet?.total ?? 0,
      recentForm: r.form ?? null,
    });

    if (!mapped.success) return { stats: null, quota, rejected: true, requestsMade: 1 };
    return { stats: mapped.data, quota, rejected: false, requestsMade: 1 };
  }

  public async fetchStandings(params: {
    leagueExternalId: string;
    seasonYear: number;
  }): Promise<ProviderFetchResult<ExternalStandingRowDto>> {
    const { json, quota } = await this.requestJson("/standings", {
      league: params.leagueExternalId,
      season: params.seasonYear,
    });

    const parsedRaw = rawApiStandingsSchema.safeParse(json);
    if (!parsedRaw.success) return { items: [], quota, rejectedCount: 1, requestsMade: 1 };

    const rows = parsedRaw.data.response[0]?.league.standings[0] ?? [];
    const items: ExternalStandingRowDto[] = [];
    let rejectedCount = 0;

    for (const row of rows) {
      const mapped = externalStandingRowSchema.safeParse({
        teamExternalId: String(row.team.id),
        teamName: row.team.name,
        rank: row.rank,
        points: row.points,
        played: row.all.played,
        won: row.all.win,
        drawn: row.all.draw,
        lost: row.all.lose,
        goalsDiff: row.goalsDiff,
        form: row.form ?? null,
      });
      if (!mapped.success) {
        rejectedCount += 1;
        continue;
      }
      items.push(mapped.data);
    }

    return { items, quota, rejectedCount, requestsMade: 1 };
  }
}

export function createSportsDataProvider(): SportsDataProvider {
  return new ApiFootballProvider();
}
