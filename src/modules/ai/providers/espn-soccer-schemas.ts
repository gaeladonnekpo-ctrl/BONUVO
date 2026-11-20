import { z } from "zod";
import {
  externalFixtureSchema,
  type ExternalFixtureDto,
  type MatchIntelligenceDto,
  type TeamKeyPlayerStat,
  type TeamRecentMatchStat,
} from "@/modules/ai/providers/types";

export const ESPN_LEAGUE_SLUG_MAP: Record<string, string> = {
  "61": "fra.1",
  "39": "eng.1",
  "140": "esp.1",
  "135": "ita.1",
  "78": "ger.1",
  "2": "uefa.champions",
  "3": "uefa.europa",
  "848": "uefa.europa.conf",
  "45": "eng.fa",
  "143": "esp.copa_del_rey",
  "137": "ita.coppa_italia",
  "66": "fra.coupe_de_france",
  "81": "ger.dfb_pokal",
  "94": "por.1",
  "88": "ned.1",
  "144": "bel.1",
  "203": "tur.1",
  "71": "bra.1",
  "253": "usa.1",
  "fra.1": "fra.1",
  "eng.1": "eng.1",
  "esp.1": "esp.1",
  "ita.1": "ita.1",
  "ger.1": "ger.1",
  "uefa.champions": "uefa.champions",
  "uefa.europa": "uefa.europa",
  "uefa.europa.conf": "uefa.europa.conf",
  "eng.fa": "eng.fa",
  "esp.copa_del_rey": "esp.copa_del_rey",
  "ita.coppa_italia": "ita.coppa_italia",
  "fra.coupe_de_france": "fra.coupe_de_france",
  "ger.dfb_pokal": "ger.dfb_pokal",
  "por.1": "por.1",
  "ned.1": "ned.1",
  "bel.1": "bel.1",
  "tur.1": "tur.1",
  "bra.1": "bra.1",
  "usa.1": "usa.1",
};

export function resolveEspnLeagueSlug(externalId: string): string {
  return ESPN_LEAGUE_SLUG_MAP[externalId.trim()] ?? externalId.trim();
}

export const espnCompetitorSchema = z.object({
  homeAway: z.enum(["home", "away"]).optional(),
  score: z.string().optional(),
  winner: z.boolean().optional(),
  team: z.object({
    id: z.union([z.number(), z.string()]),
    displayName: z.string().optional(),
    name: z.string().optional(),
    abbreviation: z.string().optional(),
    logo: z.string().optional(),
  }),
});

export const espnScoreboardSchema = z.object({
  events: z
    .array(
      z.object({
        id: z.union([z.number(), z.string()]),
        date: z.string(),
        competitions: z.array(
          z.object({
            venue: z.object({ fullName: z.string().optional() }).optional(),
            status: z
              .object({
                type: z
                  .object({
                    state: z.string().optional(),
                    name: z.string().optional(),
                    completed: z.boolean().optional(),
                  })
                  .optional(),
              })
              .optional(),
            competitors: z.array(espnCompetitorSchema),
          }),
        ),
      }),
    )
    .default([]),
});

export const espnStandingsSchema = z.object({
  children: z
    .array(
      z.object({
        standings: z
          .object({
            entries: z.array(
              z.object({
                team: z.object({
                  id: z.union([z.number(), z.string()]),
                  displayName: z.string().optional(),
                  name: z.string().optional(),
                }),
                stats: z.array(
                  z.object({
                    name: z.string(),
                    value: z.number().optional(),
                    displayValue: z.string().optional(),
                  }),
                ),
              }),
            ),
          })
          .optional(),
      }),
    )
    .default([]),
});

export const espnSummarySchema = z.object({
  lastFiveGames: z
    .array(
      z.object({
        team: z.object({ id: z.union([z.number(), z.string()]) }),
        events: z
          .array(
            z.object({
              id: z.union([z.number(), z.string()]),
              atVs: z.string().optional(),
              gameDate: z.string(),
              homeTeamId: z.union([z.number(), z.string()]).optional(),
              awayTeamId: z.union([z.number(), z.string()]).optional(),
              homeTeamScore: z.union([z.number(), z.string()]).optional(),
              awayTeamScore: z.union([z.number(), z.string()]).optional(),
              gameResult: z.string().optional(),
              score: z.string().optional(),
              opponent: z.object({ displayName: z.string() }).optional(),
            }),
          )
          .default([]),
      }),
    )
    .optional()
    .default([]),
  leaders: z
    .array(
      z.object({
        team: z.object({ id: z.union([z.number(), z.string()]) }),
        leaders: z
          .array(
            z.object({
              name: z.string().optional(),
              leaders: z
                .array(
                  z.object({
                    displayValue: z.string().optional(),
                    shortDisplayValue: z.string().optional(),
                    athlete: z.object({
                      id: z.union([z.number(), z.string()]).optional(),
                      displayName: z.string().optional(),
                      fullName: z.string().optional(),
                      headshot: z.object({ href: z.string().optional() }).optional(),
                      position: z.object({ abbreviation: z.string().optional() }).optional(),
                    }),
                    statistics: z
                      .array(z.object({ name: z.string(), value: z.number().optional() }))
                      .optional(),
                  }),
                )
                .default([]),
            }),
          )
          .default([]),
      }),
    )
    .optional()
    .default([]),
  seasonseries: z
    .array(
      z.object({
        events: z
          .array(
            z.object({
              id: z.union([z.number(), z.string()]),
              date: z.string(),
              statusType: z.object({ completed: z.boolean().optional() }).optional(),
              competitors: z.array(espnCompetitorSchema).optional().default([]),
            }),
          )
          .default([]),
      }),
    )
    .optional()
    .default([]),
});

export function mapEspnFixtureStatus(
  state?: string,
  name?: string,
  completed?: boolean,
): ExternalFixtureDto["status"] {
  const n = (name ?? "").toUpperCase();
  if (n.includes("POSTPONED")) return "postponed";
  if (n.includes("CANCEL")) return "cancelled";
  if (n.includes("ABANDON")) return "abandoned";
  if (completed || state === "post") return "finished";
  if (state === "in") return "live";
  return "scheduled";
}

export function buildEspnMatchIntelligence(
  data: z.infer<typeof espnSummarySchema>,
  params: {
    leagueExternalId: string;
    seasonYear: number;
    homeTeamExternalId: string;
    awayTeamExternalId: string;
  },
): MatchIntelligenceDto {
  const extractRecent = (teamExtId: string): TeamRecentMatchStat[] => {
    const entry = data.lastFiveGames.find((g) => String(g.team.id) === teamExtId);
    if (!entry) return [];
    return entry.events.slice(0, 5).map((ev) => {
      const resultRaw = (ev.gameResult ?? "D").toUpperCase();
      const result: "W" | "D" | "L" = resultRaw === "W" || resultRaw === "L" ? resultRaw : "D";
      const isAway = ev.atVs === "@" || String(ev.awayTeamId ?? "") === teamExtId;
      return {
        date: ev.gameDate.slice(0, 10),
        opponent: ev.opponent?.displayName ?? "Adversaire",
        score: ev.score ?? `${ev.homeTeamScore ?? 0}-${ev.awayTeamScore ?? 0}`,
        homeAway: isAway ? "away" : "home",
        result,
      };
    });
  };

  const extractPlayers = (teamExtId: string): TeamKeyPlayerStat[] => {
    const teamBlock = data.leaders.find((l) => String(l.team.id) === teamExtId);
    const goalCat =
      teamBlock?.leaders.find((c) => c.name === "goalsLeaders") ?? teamBlock?.leaders[0];
    if (!goalCat) return [];
    return goalCat.leaders.slice(0, 3).map((item) => {
      const statNum = (key: string) =>
        Math.round(item.statistics?.find((s) => s.name === key)?.value ?? 0);
      const athleteId = item.athlete.id !== undefined ? String(item.athlete.id) : null;
      const headshotHref = item.athlete.headshot?.href?.trim() || null;
      return {
        externalId: athleteId,
        name: item.athlete.displayName ?? item.athlete.fullName ?? "Joueur",
        position: item.athlete.position?.abbreviation ?? "",
        appearances: statNum("appearances"),
        goals: statNum("totalGoals"),
        assists: statNum("goalAssists"),
        photoUrl: headshotHref,
      };
    });
  };

  const headToHeadFixtures: ExternalFixtureDto[] = [];
  for (const series of data.seasonseries) {
    for (const ev of series.events) {
      if (!ev.statusType?.completed) continue;
      const home = ev.competitors.find((c) => c.homeAway === "home") ?? ev.competitors[0];
      const away = ev.competitors.find((c) => c.homeAway === "away") ?? ev.competitors[1];
      if (!home || !away) continue;
      const hGoals =
        home.score && /^\d+$/.test(home.score) ? Number.parseInt(home.score, 10) : null;
      const aGoals =
        away.score && /^\d+$/.test(away.score) ? Number.parseInt(away.score, 10) : null;
      const valid = externalFixtureSchema.safeParse({
        externalId: String(ev.id),
        leagueExternalId: params.leagueExternalId,
        seasonYear: params.seasonYear,
        roundLabel: "H2H",
        kickoffAt: new Date(ev.date).toISOString(),
        venue: null,
        status: "finished",
        homeGoals: hGoals,
        awayGoals: aGoals,
        homeTeam: {
          externalId: String(home.team.id),
          name: home.team.displayName ?? home.team.name ?? "Home",
          logoUrl: home.team.logo ?? null,
        },
        awayTeam: {
          externalId: String(away.team.id),
          name: away.team.displayName ?? away.team.name ?? "Away",
          logoUrl: away.team.logo ?? null,
        },
      });
      if (valid.success) headToHeadFixtures.push(valid.data);
    }
  }

  return {
    homeKeyPlayers: extractPlayers(params.homeTeamExternalId),
    awayKeyPlayers: extractPlayers(params.awayTeamExternalId),
    homeRecentMatches: extractRecent(params.homeTeamExternalId),
    awayRecentMatches: extractRecent(params.awayTeamExternalId),
    headToHeadFixtures,
  };
}
