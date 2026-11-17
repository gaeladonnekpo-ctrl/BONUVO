import { eq } from "drizzle-orm";
import type { ExternalFixtureDto } from "@/modules/ai/providers/types";
import type { AppDbTransaction } from "@/server/db/context";
import { fixtures, leagues, seasons, sportsProviders, teams } from "@/server/db/schema";

const DEFAULT_LEAGUE_CONFIGS = [
  { externalId: "61", name: "Ligue 1", countryName: "France", priorityOrder: 1, tracked: true },
  {
    externalId: "39",
    name: "Premier League",
    countryName: "England",
    priorityOrder: 2,
    tracked: true,
  },
  { externalId: "140", name: "La Liga", countryName: "Spain", priorityOrder: 3, tracked: true },
  { externalId: "135", name: "Serie A", countryName: "Italy", priorityOrder: 4, tracked: true },
  {
    externalId: "78",
    name: "Bundesliga",
    countryName: "Germany",
    priorityOrder: 5,
    tracked: false,
  },
  {
    externalId: "2",
    name: "UEFA Champions League",
    countryName: "Europe",
    priorityOrder: 6,
    tracked: true,
  },
] as const;

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

  if (existingLeagues.length === 0) {
    const seasonYear = currentFootballSeasonYear();
    for (const cfg of DEFAULT_LEAGUE_CONFIGS) {
      const [league] = await db
        .insert(leagues)
        .values({
          providerId: provider.id,
          externalId: cfg.externalId,
          name: cfg.name,
          countryName: cfg.countryName,
          priorityOrder: cfg.priorityOrder,
          tracked: cfg.tracked,
          active: true,
        })
        .onConflictDoNothing()
        .returning();

      if (league) {
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
