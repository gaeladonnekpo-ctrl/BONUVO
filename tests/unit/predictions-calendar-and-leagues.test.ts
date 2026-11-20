import { describe, expect, it } from "vitest";
import {
  derivePoissonExactScoresAndDoubleChance,
  predictFixtureMarkets,
} from "@/modules/ai/model/poisson";
import {
  ESPN_LEAGUE_SLUG_MAP,
  resolveEspnLeagueSlug,
} from "@/modules/ai/providers/espn-soccer-schemas";
import { formatUtcDateIso, resolveDayWindowUtc } from "@/modules/ai/service/date-sync-service";

describe("Predictions Calendar, Competitions & Statistical Integrity", () => {
  it("supports all Big-5 leagues including Bundesliga, domestic cups, and UEFA competitions", () => {
    const required = [
      ["39", "eng.1"],
      ["140", "esp.1"],
      ["135", "ita.1"],
      ["61", "fra.1"],
      ["78", "ger.1"],
      ["2", "uefa.champions"],
      ["uefa.europa", "uefa.europa"],
      ["uefa.europa.conf", "uefa.europa.conf"],
      ["eng.fa", "eng.fa"],
      ["esp.copa_del_rey", "esp.copa_del_rey"],
      ["ita.coppa_italia", "ita.coppa_italia"],
      ["fra.coupe_de_france", "fra.coupe_de_france"],
      ["ger.dfb_pokal", "ger.dfb_pokal"],
    ] as const;

    for (const [id, slug] of required) {
      expect(ESPN_LEAGUE_SLUG_MAP[id]).toBe(slug);
      expect(resolveEspnLeagueSlug(id)).toBe(slug);
    }
  });

  it("resolves exact 24h day windows without leaking adjacent matchdays", () => {
    const win = resolveDayWindowUtc("2026-11-21", 60);
    expect(win.fromDateIso).toBe("2026-11-20T23:00:00.000Z");
    expect(win.toDateIso).toBe("2026-11-21T22:59:59.999Z");
    expect(formatUtcDateIso(new Date("2026-11-21T12:30:00.000Z"), 60)).toBe("2026-11-21");
  });

  it("derives coherent Double Chance and Top 3 exact scores strictly from Poisson parameters", () => {
    const derived = derivePoissonExactScoresAndDoubleChance({
      expectedHomeGoals: 1.65,
      expectedAwayGoals: 0.95,
      probs1x2: { home: 0.54, draw: 0.25, away: 0.21 },
    });

    expect(derived.doubleChance.oneX).toBe(79);
    expect(derived.doubleChance.twelve).toBe(75);
    expect(derived.doubleChance.xTwo).toBe(46);
    expect(derived.topExactScores).toHaveLength(3);
    expect(derived.topExactScores[0]!.probabilityPct).toBeGreaterThanOrEqual(
      derived.topExactScores[1]!.probabilityPct,
    );
    expect(derived.topExactScores[1]!.probabilityPct).toBeGreaterThanOrEqual(
      derived.topExactScores[2]!.probabilityPct,
    );
  });

  it("refuses to fabricate probabilities when statistical sample is below 6 matches", () => {
    const res = predictFixtureMarkets({
      fixtureId: "fix-small-sample",
      home: {
        teamId: "t-home",
        teamName: "Home FC",
        matchesPlayed: 4,
        goalsFor: 6,
        goalsAgainst: 4,
        homeMatches: 2,
        homeGoalsFor: 4,
        homeGoalsAgainst: 1,
        awayMatches: 2,
        awayGoalsFor: 2,
        awayGoalsAgainst: 3,
      },
      away: {
        teamId: "t-away",
        teamName: "Away FC",
        matchesPlayed: 8,
        goalsFor: 10,
        goalsAgainst: 8,
        homeMatches: 4,
        homeGoalsFor: 6,
        homeGoalsAgainst: 3,
        awayMatches: 4,
        awayGoalsFor: 4,
        awayGoalsAgainst: 5,
      },
    });

    expect(res.eligible).toBe(false);
    if (!res.eligible) {
      expect(res.reason).toBe("INSUFFICIENT_DATA");
    }
  });
});
