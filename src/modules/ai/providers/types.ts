import { z } from "zod";

export const externalTeamSchema = z.object({
  externalId: z.string().min(1).max(64),
  name: z.string().min(1).max(160),
  shortCode: z.string().max(12).nullable().optional(),
  logoUrl: z.string().url().max(500).nullable().optional(),
  countryCode: z.string().max(12).nullable().optional(),
});

export const externalFixtureSchema = z.object({
  externalId: z.string().min(1).max(64),
  leagueExternalId: z.string().min(1).max(64),
  seasonYear: z.number().int().min(2000).max(2100),
  roundLabel: z.string().max(120).nullable().optional(),
  kickoffAt: z.string().datetime({ offset: true }),
  venue: z.string().max(160).nullable().optional(),
  status: z.enum(["scheduled", "live", "finished", "postponed", "cancelled", "abandoned"]),
  homeGoals: z.number().int().min(0).max(99).nullable().optional(),
  awayGoals: z.number().int().min(0).max(99).nullable().optional(),
  homeTeam: externalTeamSchema,
  awayTeam: externalTeamSchema,
});

export const externalTeamStatsSchema = z.object({
  teamExternalId: z.string().min(1).max(64),
  leagueExternalId: z.string().min(1).max(64),
  seasonYear: z.number().int().min(2000).max(2100),
  matchesPlayed: z.number().int().min(0).max(200),
  wins: z.number().int().min(0).max(200),
  draws: z.number().int().min(0).max(200),
  losses: z.number().int().min(0).max(200),
  goalsFor: z.number().int().min(0).max(500),
  goalsAgainst: z.number().int().min(0).max(500),
  homeMatches: z.number().int().min(0).max(200),
  homeGoalsFor: z.number().int().min(0).max(500),
  homeGoalsAgainst: z.number().int().min(0).max(500),
  awayMatches: z.number().int().min(0).max(200),
  awayGoalsFor: z.number().int().min(0).max(500),
  awayGoalsAgainst: z.number().int().min(0).max(500),
  cleanSheets: z.number().int().min(0).max(200).optional().default(0),
  bttsCount: z.number().int().min(0).max(200).optional().default(0),
  over25Count: z.number().int().min(0).max(200).optional().default(0),
  recentForm: z.string().max(20).nullable().optional(),
});

export const externalStandingRowSchema = z.object({
  teamExternalId: z.string().min(1).max(64),
  teamName: z.string().min(1).max(160),
  rank: z.number().int().min(1).max(200),
  points: z.number().int().min(0).max(500),
  played: z.number().int().min(0).max(200),
  won: z.number().int().min(0).max(200),
  drawn: z.number().int().min(0).max(200),
  lost: z.number().int().min(0).max(200),
  goalsDiff: z.number().int().min(-500).max(500),
  form: z.string().max(20).nullable().optional(),
});

export type ExternalTeamDto = z.infer<typeof externalTeamSchema>;
export type ExternalFixtureDto = z.infer<typeof externalFixtureSchema>;
export type ExternalTeamStatsDto = z.infer<typeof externalTeamStatsSchema>;
export type ExternalStandingRowDto = z.infer<typeof externalStandingRowSchema>;

export interface ProviderQuotaSnapshot {
  limit: number | null;
  remaining: number | null;
  usedToday?: number;
}

export interface ProviderFetchResult<T> {
  items: T[];
  quota: ProviderQuotaSnapshot;
  rejectedCount: number;
  requestsMade: number;
}

export interface TeamKeyPlayerStat {
  externalId?: string | null;
  name: string;
  position: string;
  appearances: number;
  goals: number;
  assists: number;
  photoUrl?: string | null;
}

export interface TeamRecentMatchStat {
  date: string;
  opponent: string;
  score: string;
  homeAway: "home" | "away";
  result: "W" | "D" | "L";
}

export interface MatchIntelligenceDto {
  homeKeyPlayers: TeamKeyPlayerStat[];
  awayKeyPlayers: TeamKeyPlayerStat[];
  homeRecentMatches: TeamRecentMatchStat[];
  awayRecentMatches: TeamRecentMatchStat[];
  headToHeadFixtures: ExternalFixtureDto[];
}

export interface SportsDataProvider {
  readonly code: string;
  readonly name: string;
  isConfigured(): boolean;
  fetchUpcomingFixtures(params: {
    leagueExternalId: string;
    seasonYear: number;
    fromDateIso: string;
    toDateIso: string;
  }): Promise<ProviderFetchResult<ExternalFixtureDto>>;
  fetchFinishedFixtures(params: {
    leagueExternalId: string;
    seasonYear: number;
    fromDateIso: string;
    toDateIso: string;
  }): Promise<ProviderFetchResult<ExternalFixtureDto>>;
  fetchTeamStatistics(params: {
    leagueExternalId: string;
    seasonYear: number;
    teamExternalId: string;
  }): Promise<{
    stats: ExternalTeamStatsDto | null;
    quota: ProviderQuotaSnapshot;
    rejected: boolean;
    requestsMade: number;
  }>;
  fetchStandings(params: {
    leagueExternalId: string;
    seasonYear: number;
  }): Promise<ProviderFetchResult<ExternalStandingRowDto>>;
  fetchMatchIntelligence?(params: {
    leagueExternalId: string;
    fixtureExternalId: string;
    seasonYear: number;
    homeTeamExternalId: string;
    awayTeamExternalId: string;
  }): Promise<MatchIntelligenceDto | null>;
}
