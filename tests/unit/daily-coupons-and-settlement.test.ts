import { describe, expect, it } from "vitest";
import {
  evaluateCouponLegFromFixture,
  evaluateCouponSettlement,
} from "@/modules/ai/model/coupon-settlement";
import {
  buildCombinedCoupons,
  buildDailyCouponBatch,
  buildSinglePicks,
  computeCorrelatedComboProbability,
  filterActiveFixturesForRecommendations,
} from "@/modules/ai/model/coupons";
import type { PublicFixtureDto } from "@/modules/ai/service/public-ai-types";

function makeFixture(idx: number, overrides: Partial<PublicFixtureDto> = {}): PublicFixtureDto {
  const leagues = [
    { id: "l-eng", name: "Premier League" },
    { id: "l-esp", name: "La Liga" },
    { id: "l-ita", name: "Serie A" },
    { id: "l-ger", name: "Bundesliga" },
    { id: "l-fra", name: "Ligue 1" },
    { id: "l-ned", name: "Eredivisie" },
    { id: "l-por", name: "Primeira Liga" },
    { id: "l-ucl", name: "UEFA Champions League" },
  ];
  const league = leagues[idx % leagues.length]!;
  return {
    id: `fix-${idx}`,
    leagueId: league.id,
    leagueName: league.name,
    leagueLogo: "",
    countryName: "Europe",
    kickoffAt: "2026-11-22T18:00:00.000Z",
    venueName: "Stadium",
    roundLabel: "J12",
    fixtureStatus: "scheduled",
    homeTeamId: `h-${idx}`,
    homeTeamName: `Home ${idx}`,
    homeTeamLogo: "",
    awayTeamId: `a-${idx}`,
    awayTeamName: `Away ${idx}`,
    awayTeamLogo: "",
    homeGoals: null,
    awayGoals: null,
    predictions: [
      {
        id: `pred-1x2-${idx}`,
        market: "1x2",
        pickedSelection: "home",
        confidenceLevel: idx % 2 === 0 ? "high" : "medium",
        confidenceScore: 0.65,
        probabilities: { home: 0.62, draw: 0.22, away: 0.16 },
        expectedHomeGoals: 1.85,
        expectedAwayGoals: 0.85,
        analysisText: `Stats ${idx}`,
        analysisStatus: "template",
        couponValidated: false,
        publishedAt: "2026-11-22T09:00:00.000Z",
        lockedAt: "2026-11-22T09:00:00.000Z",
        verdict: null,
        brierScore: null,
        actualOutcome: null,
        settledAt: null,
      },
      {
        id: `pred-ou-${idx}`,
        market: "over_under_25",
        pickedSelection: "over_2_5",
        confidenceLevel: "medium",
        confidenceScore: 0.58,
        probabilities: { over_2_5: 0.58, under_2_5: 0.42 },
        expectedHomeGoals: 1.85,
        expectedAwayGoals: 0.85,
        analysisText: `OU ${idx}`,
        analysisStatus: "template",
        couponValidated: false,
        publishedAt: "2026-11-22T09:00:00.000Z",
        lockedAt: "2026-11-22T09:00:00.000Z",
        verdict: null,
        brierScore: null,
        actualOutcome: null,
        settledAt: null,
      },
      {
        id: `pred-btts-${idx}`,
        market: "btts",
        pickedSelection: "yes",
        confidenceLevel: "medium",
        confidenceScore: 0.54,
        probabilities: { yes: 0.54, no: 0.46 },
        expectedHomeGoals: 1.85,
        expectedAwayGoals: 0.85,
        analysisText: `BTTS ${idx}`,
        analysisStatus: "template",
        couponValidated: false,
        publishedAt: "2026-11-22T09:00:00.000Z",
        lockedAt: "2026-11-22T09:00:00.000Z",
        verdict: null,
        brierScore: null,
        actualOutcome: null,
        settledAt: null,
      },
    ],
    ...overrides,
  };
}

describe("BONUVO AI Daily Coupons, Singles, Active Filtering & Settlement", () => {
  it("builds 4 distinct multi-league combined coupons (>=3 legs each) and >=5 singles", () => {
    const slate = Array.from({ length: 10 }, (_, i) => makeFixture(i));
    const batch = buildDailyCouponBatch(slate);

    expect(batch.coupons).toHaveLength(4);
    expect(batch.singles.length).toBeGreaterThanOrEqual(5);
    expect(batch.shortfallFr).toBeNull();

    const profiles = new Set(batch.coupons.map((c) => c.profile));
    expect(profiles.size).toBe(4);

    const compositionKeys = new Set<string>();
    for (const c of batch.coupons) {
      expect(c.legs.length).toBeGreaterThanOrEqual(3);
      expect(c.distinctLeaguesCount).toBeGreaterThanOrEqual(2);
      const uniqueFixtures = new Set(c.legs.map((l) => l.fixtureId));
      expect(uniqueFixtures.size).toBe(c.legs.length);
      const compKey = c.legs
        .map((l) => `${l.fixtureId}:${l.market}:${l.pickedSelection}`)
        .sort()
        .join("|");
      expect(compositionKeys.has(compKey)).toBe(false);
      compositionKeys.add(compKey);
    }
  });

  it("never multiplies probabilities naively (applies correlation penalty)", () => {
    const probs = [0.7, 0.7, 0.7];
    const naive = 0.7 * 0.7 * 0.7;
    const correlated = computeCorrelatedComboProbability(probs, 1);
    expect(correlated).toBeLessThan(naive);
    expect(correlated).toBeGreaterThan(0);
  });

  it("signals statistical shortfall without fabricating coupons when < 3 active fixtures exist", () => {
    const smallSlate = [makeFixture(0), makeFixture(1)];
    const batch = buildDailyCouponBatch(smallSlate);

    expect(batch.coupons).toHaveLength(0);
    expect(batch.singles).toHaveLength(2);
    expect(batch.shortfallFr).toContain("0/4 combinés");
    expect(batch.shortfallEn).toContain("0/4 combos");
  });

  it("automatically removes finished, cancelled, postponed, and lost selections from active display", () => {
    const mixedSlate = [
      makeFixture(0, { fixtureStatus: "finished", homeGoals: 2, awayGoals: 1 }),
      makeFixture(1, { fixtureStatus: "cancelled" }),
      makeFixture(2, { fixtureStatus: "postponed" }),
      makeFixture(3, { fixtureStatus: "scheduled" }),
      makeFixture(4, { fixtureStatus: "scheduled" }),
      makeFixture(5, { fixtureStatus: "scheduled" }),
    ];

    const active = filterActiveFixturesForRecommendations(mixedSlate);
    expect(active.map((f) => f.id)).toEqual(["fix-3", "fix-4", "fix-5"]);

    const singles = buildSinglePicks(mixedSlate);
    expect(singles.every((s) => ["fix-3", "fix-4", "fix-5"].includes(s.fixtureId))).toBe(true);

    const coupons = buildCombinedCoupons(mixedSlate);
    for (const c of coupons) {
      expect(c.legs.every((l) => ["fix-3", "fix-4", "fix-5"].includes(l.fixtureId))).toBe(true);
    }
  });

  it("handles corrected official scores when re-evaluating coupon legs and settlement", () => {
    // Initially reported 0-1 (home pick lost)
    const initialLeg = evaluateCouponLegFromFixture({
      fixtureStatus: "finished",
      homeGoals: 0,
      awayGoals: 1,
      market: "1x2",
      pickedSelection: "home",
    });
    expect(initialLeg).toBe("lost");
    expect(evaluateCouponSettlement([initialLeg, "won", "won"])).toBe("lost");

    // Corrected official score 2-1 (home pick won)
    const correctedLeg = evaluateCouponLegFromFixture({
      fixtureStatus: "finished",
      homeGoals: 2,
      awayGoals: 1,
      market: "1x2",
      pickedSelection: "home",
    });
    expect(correctedLeg).toBe("won");
    expect(evaluateCouponSettlement([correctedLeg, "won", "won"])).toBe("won");
  });
});
