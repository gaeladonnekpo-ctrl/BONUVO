import { describe, expect, it } from "vitest";
import { buildEspnMatchIntelligence } from "@/modules/ai/providers/espn-soccer-schemas";
import { normalizePlayerName } from "@/modules/ai/service/player-photo-resolver";

describe("Dynamic key player photos & ESPN intelligence extraction", () => {
  it("normalizes accented player names consistently for roster matching", () => {
    expect(normalizePlayerName("Matías Soulé")).toBe("matias soule");
    expect(normalizePlayerName("Matìas Soulè")).toBe("matias soule");
    expect(normalizePlayerName("José Romero")).toBe("jose romero");
  });

  it("extracts externalId and official ESPN headshot photoUrl from match leaders", () => {
    const intel = buildEspnMatchIntelligence(
      {
        lastFiveGames: [],
        leaders: [
          {
            team: { id: "104" },
            leaders: [
              {
                name: "goalsLeaders",
                leaders: [
                  {
                    athlete: {
                      id: "259481",
                      displayName: "Donyell Malen",
                      headshot: {
                        href: "https://a.espncdn.com/i/headshots/soccer/players/full/259481.png",
                      },
                      position: { abbreviation: "F" },
                    },
                    statistics: [
                      { name: "appearances", value: 10 },
                      { name: "totalGoals", value: 8 },
                      { name: "goalAssists", value: 2 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        seasonseries: [],
      },
      {
        leagueExternalId: "ita.1",
        seasonYear: 2026,
        homeTeamExternalId: "115",
        awayTeamExternalId: "104",
      },
    );

    expect(intel.awayKeyPlayers).toHaveLength(1);
    expect(intel.awayKeyPlayers[0]).toMatchObject({
      externalId: "259481",
      name: "Donyell Malen",
      position: "F",
      goals: 8,
      appearances: 10,
      assists: 2,
      photoUrl: "https://a.espncdn.com/i/headshots/soccer/players/full/259481.png",
    });
  });
});
