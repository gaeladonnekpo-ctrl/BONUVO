import { eq } from "drizzle-orm";
import type { ExternalFixtureDto } from "@/modules/ai/providers/types";
import { recordLiveTelemetryFromItems } from "@/modules/ai/service/live-fixture-sync";
import type { AppDbTransaction } from "@/server/db/context";
import { fixtures, leagues, seasons, sportsProviders, teams } from "@/server/db/schema";

const DEFAULT_LEAGUE_CONFIGS = [
  {
    externalId: "39",
    name: "Premier League",
    countryName: "England",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
    priorityOrder: 1,
    tracked: true,
  },
  {
    externalId: "140",
    name: "La Liga",
    countryName: "Spain",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",
    priorityOrder: 2,
    tracked: true,
  },
  {
    externalId: "135",
    name: "Serie A",
    countryName: "Italy",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png",
    priorityOrder: 3,
    tracked: true,
  },
  {
    externalId: "61",
    name: "Ligue 1",
    countryName: "France",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png",
    priorityOrder: 4,
    tracked: true,
  },
  {
    externalId: "78",
    name: "Bundesliga",
    countryName: "Germany",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png",
    priorityOrder: 5,
    tracked: true,
  },
  {
    externalId: "2",
    name: "UEFA Champions League",
    countryName: "Europe",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png",
    priorityOrder: 6,
    tracked: true,
  },
  {
    externalId: "uefa.europa",
    name: "UEFA Europa League",
    countryName: "Europe",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png",
    priorityOrder: 7,
    tracked: true,
  },
  {
    externalId: "uefa.europa.conf",
    name: "UEFA Conference League",
    countryName: "Europe",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/20296.png",
    priorityOrder: 8,
    tracked: true,
  },
  {
    externalId: "eng.fa",
    name: "FA Cup",
    countryName: "England",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/40.png",
    priorityOrder: 9,
    tracked: true,
  },
  {
    externalId: "esp.copa_del_rey",
    name: "Copa del Rey",
    countryName: "Spain",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/80.png",
    priorityOrder: 10,
    tracked: true,
  },
  {
    externalId: "ita.coppa_italia",
    name: "Coppa Italia",
    countryName: "Italy",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/2192.png",
    priorityOrder: 11,
    tracked: true,
  },
  {
    externalId: "fra.coupe_de_france",
    name: "Coupe de France",
    countryName: "France",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/182.png",
    priorityOrder: 12,
    tracked: true,
  },
  {
    externalId: "ger.dfb_pokal",
    name: "DFB-Pokal",
    countryName: "Germany",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/2061.png",
    priorityOrder: 13,
    tracked: true,
  },
  {
    externalId: "por.1",
    name: "Primeira Liga",
    countryName: "Portugal",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/14.png",
    priorityOrder: 14,
    tracked: true,
  },
  {
    externalId: "ned.1",
    name: "Eredivisie",
    countryName: "Netherlands",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/11.png",
    priorityOrder: 15,
    tracked: true,
  },
  {
    externalId: "bel.1",
    name: "Belgian Pro League",
    countryName: "Belgium",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/6.png",
    priorityOrder: 16,
    tracked: true,
  },
  {
    externalId: "tur.1",
    name: "Süper Lig",
    countryName: "Turkey",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/18.png",
    priorityOrder: 17,
    tracked: true,
  },
  {
    externalId: "bra.1",
    name: "Brasileirão Série A",
    countryName: "Brazil",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/85.png",
    priorityOrder: 18,
    tracked: true,
  },
  {
    externalId: "usa.1",
    name: "MLS",
    countryName: "USA",
    logoUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/19.png",
    priorityOrder: 19,
    tracked: true,
  },
] as const;

export function resolveDefaultLeagueLogo(externalId: string, name?: string): string {
  const byId = DEFAULT_LEAGUE_CONFIGS.find((c) => c.externalId === externalId);
  if (byId) return byId.logoUrl;
  const byName = DEFAULT_LEAGUE_CONFIGS.find(
    (c) => name && c.name.toLowerCase() === name.toLowerCase(),
  );
  return byName?.logoUrl ?? "";
}

const TREND_LABELS: Record<string, string> = {
  home: "victoire domicile",
  away: "victoire extérieur",
  draw: "match nul",
  over_2_5: "+2,5 buts",
  under_2_5: "-2,5 buts",
  yes: "Oui",
  no: "Non",
};

export function humanizeAnalysisText(raw: string): string {
  return raw
    .replace(/Distribution Poisson\s*:/gi, "Probabilités estimées :")
    .replace(/\(tendance\s*:\s*([a-z0-9_]+)\)/gi, (m, k: string) =>
      TREND_LABELS[k.toLowerCase()] ? `(tendance : ${TREND_LABELS[k.toLowerCase()]})` : m,
    );
}

export function currentFootballSeasonYear(now = new Date()): number {
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  return month >= 7 ? year : year - 1;
}

export function summarizeRecentForm(formText: string | null | undefined): {
  matches: number;
  points: number;
} {
  if (!formText) return { matches: 0, points: 0 };
  const recent = formText.trim().toUpperCase().slice(-5);
  let matches = 0;
  let points = 0;
  for (const ch of recent) {
    if (ch === "W") {
      points += 3;
      matches += 1;
    } else if (ch === "D") {
      points += 1;
      matches += 1;
    } else if (ch === "L") {
      matches += 1;
    }
  }
  return { matches, points };
}

export async function ensureProviderAndLeagues(
  db: AppDbTransaction,
  providerMeta?: {
    slug: string;
    name: string;
    baseUrl: string;
    dailyQuotaLimit: number;
    quotaReserve: number;
  },
) {
  const meta = providerMeta ?? {
    slug: "espn-soccer",
    name: "ESPN Live Soccer Feeds",
    baseUrl: "https://site.api.espn.com",
    dailyQuotaLimit: 5000,
    quotaReserve: 50,
  };

  const [provider] = await db
    .insert(sportsProviders)
    .values({
      slug: meta.slug,
      name: meta.name,
      baseUrl: meta.baseUrl,
      dailyQuotaLimit: meta.dailyQuotaLimit,
      quotaReserve: meta.quotaReserve,
      active: true,
      status: "active",
    })
    .onConflictDoUpdate({
      target: sportsProviders.slug,
      set: { name: meta.name, baseUrl: meta.baseUrl, active: true, updatedAt: new Date() },
    })
    .returning();

  if (!provider) {
    throw new Error("PROVIDER_UPSERT_FAILED");
  }

  const existingLeagues = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.providerId, provider.id))
    .limit(1);

  const seasonYear = currentFootballSeasonYear();
  for (const cfg of DEFAULT_LEAGUE_CONFIGS) {
    const [league] = await db
      .insert(leagues)
      .values({
        providerId: provider.id,
        externalId: cfg.externalId,
        name: cfg.name,
        countryName: cfg.countryName,
        logoUrl: cfg.logoUrl,
        priorityOrder: cfg.priorityOrder,
        tracked: cfg.tracked,
        active: true,
      })
      .onConflictDoUpdate({
        target: [leagues.providerId, leagues.externalId],
        set: {
          logoUrl: cfg.logoUrl,
          countryName: cfg.countryName,
          priorityOrder: cfg.priorityOrder,
          tracked: cfg.tracked,
          active: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (league && existingLeagues.length === 0) {
      await db
        .insert(seasons)
        .values({
          providerId: provider.id,
          leagueId: league.id,
          year: seasonYear,
          isCurrent: true,
        })
        .onConflictDoNothing();
    }
  }

  return provider;
}

export async function ensureDefaultProviderAndLeagues(db: AppDbTransaction) {
  return ensureProviderAndLeagues(db);
}

export async function upsertNormalizedFixtures(params: {
  db: AppDbTransaction;
  providerId: string;
  leagueId: string;
  seasonId: string;
  ingestionRunId: string;
  items: ExternalFixtureDto[];
}): Promise<number> {
  recordLiveTelemetryFromItems(params.items);
  let upserted = 0;
  for (const item of params.items) {
    const [homeTeam] = await params.db
      .insert(teams)
      .values({
        providerId: params.providerId,
        externalId: item.homeTeam.externalId,
        name: item.homeTeam.name,
        shortCode: item.homeTeam.shortCode ?? "",
        logoUrl: item.homeTeam.logoUrl ?? "",
        countryName: item.homeTeam.countryCode ?? "",
      })
      .onConflictDoUpdate({
        target: [teams.providerId, teams.externalId],
        set: {
          name: item.homeTeam.name,
          logoUrl: item.homeTeam.logoUrl ?? "",
          updatedAt: new Date(),
        },
      })
      .returning();

    const [awayTeam] = await params.db
      .insert(teams)
      .values({
        providerId: params.providerId,
        externalId: item.awayTeam.externalId,
        name: item.awayTeam.name,
        shortCode: item.awayTeam.shortCode ?? "",
        logoUrl: item.awayTeam.logoUrl ?? "",
        countryName: item.awayTeam.countryCode ?? "",
      })
      .onConflictDoUpdate({
        target: [teams.providerId, teams.externalId],
        set: {
          name: item.awayTeam.name,
          logoUrl: item.awayTeam.logoUrl ?? "",
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!homeTeam || !awayTeam || homeTeam.id === awayTeam.id) continue;

    await params.db
      .insert(fixtures)
      .values({
        providerId: params.providerId,
        leagueId: params.leagueId,
        seasonId: params.seasonId,
        externalId: item.externalId,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        kickoffAt: new Date(item.kickoffAt),
        venueName: item.venue ?? "",
        roundLabel: item.roundLabel ?? "",
        fixtureStatus: item.status,
        homeGoals: item.homeGoals ?? null,
        awayGoals: item.awayGoals ?? null,
        lastIngestionRunId: params.ingestionRunId,
      })
      .onConflictDoUpdate({
        target: [fixtures.providerId, fixtures.externalId],
        set: {
          kickoffAt: new Date(item.kickoffAt),
          venueName: item.venue ?? "",
          roundLabel: item.roundLabel ?? "",
          fixtureStatus: item.status,
          homeGoals: item.homeGoals ?? null,
          awayGoals: item.awayGoals ?? null,
          lastIngestionRunId: params.ingestionRunId,
          updatedAt: new Date(),
        },
      });
    upserted += 1;
  }
  return upserted;
}
