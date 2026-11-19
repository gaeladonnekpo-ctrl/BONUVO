export interface PublicPredictionCardDto {
  id: string;
  market: "1x2" | "over_under_25" | "btts";
  pickedSelection: string;
  confidenceLevel: "low" | "medium" | "high";
  confidenceScore: number;
  probabilities: Record<string, number>;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  analysisText: string;
  analysisStatus: string;
  couponValidated: boolean;
  publishedAt: string | null;
  lockedAt: string | null;
  verdict: "won" | "lost" | "void" | null;
  brierScore: number | null;
  actualOutcome: string | null;
  settledAt: string | null;
}

export interface PublicFixtureDto {
  id: string;
  leagueId: string;
  leagueName: string;
  leagueLogo: string;
  countryName: string;
  kickoffAt: string;
  venueName: string;
  roundLabel: string;
  fixtureStatus: string;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamLogo: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamLogo: string;
  homeGoals: number | null;
  awayGoals: number | null;
  providerName?: string;
  lastIngestedAt?: string | null;
  predictions: PublicPredictionCardDto[];
}

export interface LeagueFilterOption {
  id: string;
  externalId?: string;
  name: string;
  countryName: string;
  logoUrl: string;
}
