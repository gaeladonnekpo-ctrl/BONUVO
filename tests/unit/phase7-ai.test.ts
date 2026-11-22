import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PLATFORM_GAMING_GUIDES,
  buildCombinedCoupons,
  buildSinglePicks,
} from "@/modules/ai/model/coupons";
import {
  assertNoForbiddenTerms,
  findForbiddenTerms,
  verifyNarrativeNumbersInFacts,
} from "@/modules/ai/model/language-guard";
import {
  MIN_MATCHES_THRESHOLD,
  MODEL_VERSION_TAG,
  poissonPmf,
  predictFixtureMarkets,
  type TeamModelInput,
} from "@/modules/ai/model/poisson";
import {
  computeAccuracySummary,
  computeBrierScore,
  settlePrediction,
} from "@/modules/ai/model/settle";
import { ApiFootballProvider } from "@/modules/ai/providers/api-football";
import { EspnSoccerProvider } from "@/modules/ai/providers/espn-soccer";
import type { PublicFixtureDto } from "@/modules/ai/service/public-ai-types";

function buildTeam(overrides?: Partial<TeamModelInput>): TeamModelInput {
  return {
    teamId: "team-a",
    teamName: "Olympique Demo",
    matchesPlayed: 12,
    goalsFor: 24,
    goalsAgainst: 12,
    homeMatches: 6,
    homeGoalsFor: 14,
    homeGoalsAgainst: 5,
    awayMatches: 6,
    awayGoalsFor: 10,
    awayGoalsAgainst: 7,
    recentForm: "WWDWL",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Phase 7 — Modèle Poisson v1.0, garde-fous et règlement", () => {
  it("calcule des probabilités strictement normalisées à 1 et déterministes", () => {
    const home = buildTeam({ teamId: "home-1", teamName: "FC Home" });
    const away = buildTeam({
      teamId: "away-1",
      teamName: "FC Away",
      goalsFor: 12,
      goalsAgainst: 18,
      awayGoalsFor: 5,
      awayGoalsAgainst: 11,
      recentForm: "LDLLL",
    });

    const first = predictFixtureMarkets({ fixtureId: "fix-1", home, away });
    const second = predictFixtureMarkets({ fixtureId: "fix-1", home, away });

    expect(first.eligible).toBe(true);
    expect(second.eligible).toBe(true);
    if (!first.eligible || !second.eligible) return;

    expect(first.modelVersion).toBe(MODEL_VERSION_TAG);
    expect(first.inputSnapshotHash).toBe(second.inputSnapshotHash);
    expect(first.expectedHomeGoals).toBeGreaterThan(first.expectedAwayGoals);
    expect(first.markets).toHaveLength(3);

    for (const m of first.markets) {
      const sum = Object.values(m.probabilities).reduce((acc, v) => acc + v, 0);
      expect(sum).toBeCloseTo(1, 9);
      expect(findForbiddenTerms(m.analysisText)).toEqual([]);
    }

    // Vérification manuelle de P(X = 0) = e^-lambda
    expect(poissonPmf(1.5, 0)).toBeCloseTo(Math.exp(-1.5), 10);
  });

  it("refuse tout pronostic si une équipe a moins de 6 matchs joués", () => {
    const home = buildTeam({ matchesPlayed: MIN_MATCHES_THRESHOLD - 1 });
    const away = buildTeam({ teamId: "away-1", matchesPlayed: 15 });

    const res = predictFixtureMarkets({ fixtureId: "fix-short", home, away });
    expect(res.eligible).toBe(false);
    if (!res.eligible) {
      expect(res.reason).toBe("INSUFFICIENT_DATA");
      expect(res.minMatchesRequired).toBe(6);
    }
  });

  it("règle exactement won / lost / void et calcule le score de Brier", () => {
    const wonEval = settlePrediction({
      fixtureStatus: "finished",
      homeGoals: 2,
      awayGoals: 1,
      market: "1x2",
      recommendedPick: "home",
      probabilities: { home: 0.6, draw: 0.25, away: 0.15 },
    });
    expect(wonEval).toEqual({
      verdict: "won",
      actualOutcome: "home",
      brierScore: computeBrierScore({
        market: "1x2",
        recommendedPick: "home",
        actualOutcome: "home",
        probabilities: { home: 0.6, draw: 0.25, away: 0.15 },
      }),
    });
    // (0.6-1)^2 + (0.25-0)^2 + (0.15-0)^2 = 0.16 + 0.0625 + 0.0225 = 0.245
    expect(wonEval?.brierScore).toBeCloseTo(0.245, 4);

    const voidEval = settlePrediction({
      fixtureStatus: "postponed",
      homeGoals: null,
      awayGoals: null,
      market: "btts",
      recommendedPick: "yes",
      probabilities: { yes: 0.55, no: 0.45 },
    });
    expect(voidEval).toEqual({
      verdict: "void",
      actualOutcome: "void",
      brierScore: null,
    });

    const summary = computeAccuracySummary([
      { market: "1x2", verdict: "won", brierScore: 0.245 },
      { market: "1x2", verdict: "lost", brierScore: 0.8 },
      { market: "btts", verdict: "void", brierScore: null },
    ]);
    expect(summary).toEqual({
      totalSettled: 3,
      won: 1,
      lost: 1,
      voidCount: 1,
      winRatePct: 50,
      avgBrierScore: 0.5225,
      brierReady: false,
    });
  });

  it("bloque les termes promotionnels interdits et détecte les nombres inventés", () => {
    expect(() => assertNoForbiddenTerms("Victoire garantie à 100% ce soir")).toThrow(
      /FORBIDDEN_LANGUAGE/,
    );
    expect(() => assertNoForbiddenTerms("Pari sans risque pour ce match")).toThrow();
    expect(() =>
      assertNoForbiddenTerms("Estimation statistique : 58% domicile sur 12 matchs."),
    ).not.toThrow();

    const facts = { expectedHomeGoals: 1.85, homeMatches: 12, probHome: 0.58 };
    expect(
      verifyNarrativeNumbersInFacts(
        "Sur 12 matchs, la moyenne attendue est de 1.85 buts (58%).",
        facts,
      ).valid,
    ).toBe(true);
    expect(verifyNarrativeNumbersInFacts("Série de 99 buts invaincus.", facts)).toEqual({
      valid: false,
      unknownNumbers: ["99"],
    });
  });

  it("valide Zod sur les payloads fournisseur et remonte les en-têtes de quota", async () => {
    vi.stubEnv("API_FOOTBALL_KEY", "test-api-key-123456");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            response: [
              { malformed: true }, // doit être rejeté par Zod
              {
                fixture: {
                  id: 9001,
                  date: "2026-11-20T20:00:00+00:00",
                  venue: { name: "Stade Test" },
                  status: { short: "NS" },
                },
                league: { id: 61, season: 2026, round: "J12" },
                teams: {
                  home: { id: 10, name: "Home FC", logo: "https://example.com/h.png" },
                  away: { id: 20, name: "Away FC", logo: "https://example.com/a.png" },
                },
                goals: { home: null, away: null },
              },
            ],
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "x-ratelimit-requests-limit": "100",
              "x-ratelimit-requests-remaining": "12",
            },
          },
        ),
      ),
    );

    const provider = new ApiFootballProvider({ apiKey: "test-api-key-123456" });
    const res = await provider.fetchUpcomingFixtures({
      leagueExternalId: "61",
      seasonYear: 2026,
      fromDateIso: "2026-11-19",
      toDateIso: "2026-11-25",
    });

    expect(res.items).toHaveLength(1);
    expect(res.rejectedCount).toBe(1);
    expect(res.quota).toEqual({ limit: 100, remaining: 12 });
    expect(res.items[0]?.externalId).toBe("9001");
  });

  it("génère des paris simples, coupons combinés et parse les flux temps réel ESPN", async () => {
    const sampleFixture = (id: string, home: string, away: string): PublicFixtureDto => ({
      id,
      leagueId: "l-1",
      leagueName: "Premier League",
      leagueLogo: "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
      countryName: "England",
      kickoffAt: "2026-11-21T15:00:00.000Z",
      venueName: "Stadium",
      roundLabel: "J12",
      fixtureStatus: "scheduled",
      homeTeamId: `${id}-h`,
      homeTeamName: home,
      homeTeamLogo: "",
      awayTeamId: `${id}-a`,
      awayTeamName: away,
      awayTeamLogo: "",
      homeGoals: null,
      awayGoals: null,
      predictions: [
        {
          id: `${id}-p1`,
          market: "1x2",
          pickedSelection: "home",
          confidenceLevel: "high",
          confidenceScore: 0.72,
          probabilities: { home: 0.65, draw: 0.2, away: 0.15 },
          expectedHomeGoals: 2.1,
          expectedAwayGoals: 0.8,
          analysisText: "Analyse statistique réelle.",
          analysisStatus: "template",
          couponValidated: false,
          publishedAt: "2026-11-17T10:00:00.000Z",
          lockedAt: "2026-11-17T10:00:00.000Z",
          verdict: null,
          brierScore: null,
          actualOutcome: null,
          settledAt: null,
        },
      ],
    });

    const slate = [
      sampleFixture("f1", "Arsenal", "Everton"),
      sampleFixture("f2", "Man City", "Fulham"),
      sampleFixture("f3", "Liverpool", "Chelsea"),
    ];
    const singles = buildSinglePicks(slate);
    const coupons = buildCombinedCoupons(slate);

    expect(singles.length).toBeGreaterThanOrEqual(2);
    expect(coupons.length).toBeGreaterThanOrEqual(2);
    expect(PLATFORM_GAMING_GUIDES.length).toBe(3);

    for (const c of coupons) {
      expect(c.legs.length).toBeGreaterThanOrEqual(3);
      expect(c.combinedProbabilityPct).toBeGreaterThan(0);
      expect(c.combinedProbabilityPct).toBeLessThanOrEqual(100);
    }

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            events: [
              {
                id: "401999",
                date: "2026-11-21T15:00Z",
                competitions: [
                  {
                    venue: { fullName: "Emirates Stadium" },
                    status: { type: { state: "pre", name: "STATUS_SCHEDULED", completed: false } },
                    competitors: [
                      {
                        homeAway: "home",
                        team: { id: "359", displayName: "Arsenal", abbreviation: "ARS" },
                      },
                      {
                        homeAway: "away",
                        team: { id: "368", displayName: "Everton", abbreviation: "EVE" },
                      },
                    ],
                  },
                ],
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const espn = new EspnSoccerProvider();
    const upcoming = await espn.fetchUpcomingFixtures({
      leagueExternalId: "39",
      seasonYear: 2026,
      fromDateIso: "2026-11-20",
      toDateIso: "2026-11-25",
    });
    expect(upcoming.items).toHaveLength(1);
    expect(upcoming.items[0]?.homeTeam.name).toBe("Arsenal");
  });

  it("génère des paris simples, coupons combinés et parse les flux temps réel ESPN", async () => {
    const sampleFixture = (id: string, home: string, away: string): PublicFixtureDto => ({
      id,
      leagueId: "l-1",
      leagueName: "Premier League",
      leagueLogo: "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
      countryName: "England",
      kickoffAt: "2026-11-21T15:00:00.000Z",
      venueName: "Stadium",
      roundLabel: "J12",
      fixtureStatus: "scheduled",
      homeTeamId: `${id}-h`,
      homeTeamName: home,
      homeTeamLogo: "",
      awayTeamId: `${id}-a`,
      awayTeamName: away,
      awayTeamLogo: "",
      homeGoals: null,
      awayGoals: null,
      predictions: [
        {
          id: `${id}-p1`,
          market: "1x2",
          pickedSelection: "home",
          confidenceLevel: "high",
          confidenceScore: 0.72,
          probabilities: { home: 0.65, draw: 0.2, away: 0.15 },
          expectedHomeGoals: 2.1,
          expectedAwayGoals: 0.8,
          analysisText: "Analyse statistique réelle.",
          analysisStatus: "template",
          couponValidated: false,
          publishedAt: "2026-11-17T10:00:00.000Z",
          lockedAt: "2026-11-17T10:00:00.000Z",
          verdict: null,
          brierScore: null,
          actualOutcome: null,
          settledAt: null,
        },
      ],
    });

    const slate = [
      sampleFixture("f1", "Arsenal", "Everton"),
      sampleFixture("f2", "Man City", "Fulham"),
      sampleFixture("f3", "Liverpool", "Chelsea"),
    ];
    const singles = buildSinglePicks(slate);
    const coupons = buildCombinedCoupons(slate);

    expect(singles.length).toBeGreaterThanOrEqual(2);
    expect(coupons.length).toBeGreaterThanOrEqual(2);
    expect(PLATFORM_GAMING_GUIDES.length).toBe(3);

    for (const c of coupons) {
      expect(c.legs.length).toBeGreaterThanOrEqual(3);
      expect(c.combinedProbabilityPct).toBeGreaterThan(0);
      expect(c.combinedProbabilityPct).toBeLessThanOrEqual(100);
    }

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            events: [
              {
                id: "401999",
                date: "2026-11-21T15:00Z",
                competitions: [
                  {
                    venue: { fullName: "Emirates Stadium" },
                    status: { type: { state: "pre", name: "STATUS_SCHEDULED", completed: false } },
                    competitors: [
                      {
                        homeAway: "home",
                        team: { id: "359", displayName: "Arsenal", abbreviation: "ARS" },
                      },
                      {
                        homeAway: "away",
                        team: { id: "368", displayName: "Everton", abbreviation: "EVE" },
                      },
                    ],
                  },
                ],
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const espn = new EspnSoccerProvider();
    const upcoming = await espn.fetchUpcomingFixtures({
      leagueExternalId: "39",
      seasonYear: 2026,
      fromDateIso: "2026-11-20",
      toDateIso: "2026-11-25",
    });
    expect(upcoming.items).toHaveLength(1);
    expect(upcoming.items[0]?.homeTeam.name).toBe("Arsenal");
  });
});
