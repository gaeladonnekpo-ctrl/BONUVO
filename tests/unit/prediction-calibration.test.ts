import { describe, expect, it } from "vitest";
import { computeCorrelatedComboProbability } from "@/modules/ai/model/coupons";
import { predictFixtureMarkets, type TeamModelInput } from "@/modules/ai/model/poisson";
import {
  computeAccuracySummary,
  MIN_SETTLED_FOR_BRIER,
  type SettledRecordForSummary,
} from "@/modules/ai/model/settle";

/** Deterministic PRNG (Mulberry32) for reproducible historical-season simulation. */
function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function samplePoisson(lambda: number, rand: () => number): number {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rand();
  } while (p > l);
  return k - 1;
}

describe("Point 4 - Prediction calibration, combo correlation & Brier threshold", () => {
  it("caps extreme goal differentials via shrinkage toward league mean", () => {
    const outlierHome: TeamModelInput = {
      teamId: "outlier-home",
      teamName: "Outlier FC",
      matchesPlayed: 6,
      goalsFor: 30,
      goalsAgainst: 0,
      homeMatches: 6,
      homeGoalsFor: 30,
      homeGoalsAgainst: 0,
      awayMatches: 0,
      awayGoalsFor: 0,
      awayGoalsAgainst: 0,
    };
    const weakAway: TeamModelInput = {
      teamId: "weak-away",
      teamName: "Weak FC",
      matchesPlayed: 6,
      goalsFor: 1,
      goalsAgainst: 24,
      homeMatches: 0,
      homeGoalsFor: 0,
      homeGoalsAgainst: 0,
      awayMatches: 6,
      awayGoalsFor: 1,
      awayGoalsAgainst: 24,
    };

    const res = predictFixtureMarkets({
      fixtureId: "fx-extreme",
      home: outlierHome,
      away: weakAway,
      baseline: { homeGoalAvg: 1.45, awayGoalAvg: 1.15 },
    });

    expect(res.eligible).toBe(true);
    if (res.eligible) {
      expect(res.modelVersion).toBe("poisson-v2.0");
      expect(res.expectedHomeGoals).toBeLessThanOrEqual(3.2);
      expect(res.expectedAwayGoals).toBeGreaterThanOrEqual(0.25);
    }
  });

  it("computes confidence per match rather than uniformly per league", () => {
    const strong: TeamModelInput = {
      teamId: "s",
      teamName: "Strong",
      matchesPlayed: 20,
      goalsFor: 44,
      goalsAgainst: 14,
      homeMatches: 10,
      homeGoalsFor: 26,
      homeGoalsAgainst: 6,
      awayMatches: 10,
      awayGoalsFor: 18,
      awayGoalsAgainst: 8,
    };
    const weak: TeamModelInput = {
      teamId: "w",
      teamName: "Weak",
      matchesPlayed: 20,
      goalsFor: 14,
      goalsAgainst: 42,
      homeMatches: 10,
      homeGoalsFor: 8,
      homeGoalsAgainst: 18,
      awayMatches: 10,
      awayGoalsFor: 6,
      awayGoalsAgainst: 24,
    };
    const evenA: TeamModelInput = {
      ...strong,
      teamId: "ea",
      goalsFor: 26,
      goalsAgainst: 24,
      homeGoalsFor: 14,
      homeGoalsAgainst: 11,
    };
    const evenB: TeamModelInput = {
      ...strong,
      teamId: "eb",
      goalsFor: 25,
      goalsAgainst: 25,
      awayGoalsFor: 11,
      awayGoalsAgainst: 13,
    };

    const lopsided = predictFixtureMarkets({ fixtureId: "m1", home: strong, away: weak });
    const balanced = predictFixtureMarkets({ fixtureId: "m2", home: evenA, away: evenB });

    expect(lopsided.eligible && balanced.eligible).toBe(true);
    if (lopsided.eligible && balanced.eligible) {
      const c1 = lopsided.markets.find((m) => m.market === "1x2")!.confidenceScore;
      const c2 = balanced.markets.find((m) => m.market === "1x2")!.confidenceScore;
      expect(c1).toBeGreaterThan(c2);
    }
  });

  it("computes combined coupon probability strictly below naive independence assumption", () => {
    const naive = 0.75 * 0.72;
    const crossLeague = computeCorrelatedComboProbability([0.75, 0.72], 0);
    const sameLeague = computeCorrelatedComboProbability([0.75, 0.72], 1);

    expect(crossLeague).toBeLessThan(naive);
    expect(sameLeague).toBeLessThan(crossLeague);
    expect(sameLeague).toBeGreaterThan(0.4);
  });

  it("enforces the 50 settled matches threshold before marking Brier score ready", () => {
    const mk = (n: number): SettledRecordForSummary[] =>
      Array.from({ length: n }, (_, i) => ({
        verdict: i % 3 === 0 ? "lost" : "won",
        brierScore: 0.21,
        market: "1x2",
      }));

    expect(computeAccuracySummary(mk(MIN_SETTLED_FOR_BRIER - 1)).brierReady).toBe(false);
    expect(computeAccuracySummary(mk(MIN_SETTLED_FOR_BRIER)).brierReady).toBe(true);
  });

  it("validates on a full simulated past season that ~70% predictions hit ~70% empirically", () => {
    const rand = createRng(20261119);
    const teamCount = 20;
    const trueAttack = Array.from(
      { length: teamCount },
      (_, i) => 0.8 + (i / (teamCount - 1)) * 0.9,
    );
    const trueDefense = Array.from(
      { length: teamCount },
      (_, i) => 1.35 - (i / (teamCount - 1)) * 0.55,
    );

    const stats = Array.from({ length: teamCount }, (_, i) => ({
      teamId: `t-${i}`,
      teamName: `Team ${i}`,
      matchesPlayed: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      homeMatches: 0,
      homeGoalsFor: 0,
      homeGoalsAgainst: 0,
      awayMatches: 0,
      awayGoalsFor: 0,
      awayGoalsAgainst: 0,
    }));

    let totalHomeGoals = 0;
    let totalAwayGoals = 0;
    let totalMatches = 0;
    let bucket70Hits = 0;
    let bucket70Total = 0;

    // Double round-robin: 2 halves x 190 matches = 380 matches
    for (let half = 0; half < 2; half += 1) {
      for (let i = 0; i < teamCount; i += 1) {
        for (let j = i + 1; j < teamCount; j += 1) {
          const homeIdx = half === 0 ? i : j;
          const awayIdx = half === 0 ? j : i;

          const hStats = stats[homeIdx]!;
          const aStats = stats[awayIdx]!;

          if (hStats.matchesPlayed >= 8 && aStats.matchesPlayed >= 8 && totalMatches >= 20) {
            const pred = predictFixtureMarkets({
              fixtureId: `sim-${half}-${i}-${j}`,
              home: { ...hStats },
              away: { ...aStats },
              baseline: {
                homeGoalAvg: totalHomeGoals / totalMatches,
                awayGoalAvg: totalAwayGoals / totalMatches,
              },
            });

            const trueLambdaH =
              1.42 * (trueAttack[homeIdx]! / 1.25) * (trueDefense[awayIdx]! / 1.05);
            const trueLambdaA =
              1.12 * (trueAttack[awayIdx]! / 1.25) * (trueDefense[homeIdx]! / 1.05);
            const hg = samplePoisson(trueLambdaH, rand);
            const ag = samplePoisson(trueLambdaA, rand);

            hStats.matchesPlayed += 1;
            hStats.homeMatches += 1;
            hStats.goalsFor += hg;
            hStats.goalsAgainst += ag;
            hStats.homeGoalsFor += hg;
            hStats.homeGoalsAgainst += ag;

            aStats.matchesPlayed += 1;
            aStats.awayMatches += 1;
            aStats.goalsFor += ag;
            aStats.goalsAgainst += hg;
            aStats.awayGoalsFor += ag;
            aStats.awayGoalsAgainst += hg;

            totalHomeGoals += hg;
            totalAwayGoals += ag;
            totalMatches += 1;

            if (pred.eligible) {
              const m1x2 = pred.markets.find((m) => m.market === "1x2")!;
              const p1x = (m1x2.probabilities.home ?? 0) + (m1x2.probabilities.draw ?? 0);
              const px2 = (m1x2.probabilities.draw ?? 0) + (m1x2.probabilities.away ?? 0);
              const candidates: Array<{ p: number; hit: boolean }> = [
                { p: m1x2.probabilities.home ?? 0, hit: hg > ag },
                { p: m1x2.probabilities.away ?? 0, hit: ag > hg },
                { p: p1x, hit: hg >= ag },
                { p: px2, hit: ag >= hg },
              ];
              for (const c of candidates) {
                if (c.p >= 0.65 && c.p <= 0.75) {
                  bucket70Total += 1;
                  if (c.hit) bucket70Hits += 1;
                }
              }
            }
          } else {
            const trueLambdaH =
              1.42 * (trueAttack[homeIdx]! / 1.25) * (trueDefense[awayIdx]! / 1.05);
            const trueLambdaA =
              1.12 * (trueAttack[awayIdx]! / 1.25) * (trueDefense[homeIdx]! / 1.05);
            const hg = samplePoisson(trueLambdaH, rand);
            const ag = samplePoisson(trueLambdaA, rand);

            hStats.matchesPlayed += 1;
            hStats.homeMatches += 1;
            hStats.goalsFor += hg;
            hStats.goalsAgainst += ag;
            hStats.homeGoalsFor += hg;
            hStats.homeGoalsAgainst += ag;

            aStats.matchesPlayed += 1;
            aStats.awayMatches += 1;
            aStats.goalsFor += ag;
            aStats.goalsAgainst += hg;
            aStats.awayGoalsFor += ag;
            aStats.awayGoalsAgainst += hg;

            totalHomeGoals += hg;
            totalAwayGoals += ag;
            totalMatches += 1;
          }
        }
      }
    }

    expect(bucket70Total).toBeGreaterThanOrEqual(30);
    const empiricalRate = bucket70Hits / bucket70Total;
    expect(empiricalRate).toBeGreaterThanOrEqual(0.64);
    expect(empiricalRate).toBeLessThanOrEqual(0.76);
  });
});
