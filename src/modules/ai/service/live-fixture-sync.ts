import { and, eq, inArray } from "drizzle-orm";
import { EspnSoccerProvider } from "@/modules/ai/providers/espn-soccer";
import type { ExternalFixtureDto } from "@/modules/ai/providers/types";
import {
  currentFootballSeasonYear,
  ensureProviderAndLeagues,
  upsertNormalizedFixtures,
} from "@/modules/ai/service/ingestion-helpers";
import type { PublicFixtureDto } from "@/modules/ai/service/public-ai-types";
import { withAppDb } from "@/server/db/context";
import { ingestionRuns, leagues, seasons } from "@/server/db/schema";

export interface LiveFixtureTelemetry {
  livePhase?: PublicFixtureDto["livePhase"];
  statusDetail?: string | null;
  displayClock?: string | null;
  period?: number | null;
  updatedAtMs: number;
}

const LIVE_TELEMETRY_TTL_MS = 120_000;
const LIVE_REFRESH_COOLDOWN_MS = 25_000;

const telemetryByExternalId = new Map<string, LiveFixtureTelemetry>();
const recentLeagueRefresh = new Map<string, number>();

export function recordLiveTelemetryFromItems(items: readonly ExternalFixtureDto[]): void {
  const nowMs = Date.now();
  for (const item of items) {
    if (
      item.livePhase !== undefined ||
      item.statusDetail !== undefined ||
      item.displayClock !== undefined ||
      item.period !== undefined
    ) {
      telemetryByExternalId.set(item.externalId, {
        livePhase: item.livePhase,
        statusDetail: item.statusDetail ?? null,
        displayClock: item.displayClock ?? null,
        period: item.period ?? null,
        updatedAtMs: nowMs,
      });
    }
  }
}

export function getLiveTelemetry(
  externalId: string | null | undefined,
): LiveFixtureTelemetry | null {
  if (!externalId) return null;
  const entry = telemetryByExternalId.get(externalId);
  if (!entry) return null;
  if (Date.now() - entry.updatedAtMs > LIVE_TELEMETRY_TTL_MS) {
    telemetryByExternalId.delete(externalId);
    return null;
  }
  return entry;
}

export function isFixtureInActiveWindow(params: {
  fixtureStatus: string;
  kickoffAt: Date | string;
  nowMs?: number;
}): boolean {
  const nowMs = params.nowMs ?? Date.now();
  if (params.fixtureStatus === "live") return true;
  if (params.fixtureStatus !== "scheduled") return false;
  const kickoffMs =
    params.kickoffAt instanceof Date ? params.kickoffAt.getTime() : Date.parse(params.kickoffAt);
  if (!Number.isFinite(kickoffMs)) return false;
  // Refresh if kickoff has already passed (within last 6 hours) or is starting within 2 minutes
  return kickoffMs <= nowMs + 120_000 && kickoffMs >= nowMs - 6 * 3600_000;
}

/**
 * Targeted live refresh for only the league(s) that currently have scheduled/live matches
 * in the active match window. Protected by a 25s per-league cooldown to avoid excessive API calls.
 */
export async function refreshLiveFixturesForLeagueIds(params: {
  leagueIds: string[];
  fromDateIso: string;
  toDateIso: string;
  force?: boolean;
}): Promise<number> {
  const uniqueLeagueIds = Array.from(new Set(params.leagueIds.filter(Boolean)));
  if (uniqueLeagueIds.length === 0) return 0;

  const now = new Date();
  const nowMs = now.getTime();
  const dateKey = params.fromDateIso.slice(0, 10);

  const leaguesToFetchIds = params.force
    ? uniqueLeagueIds
    : uniqueLeagueIds.filter((id) => {
        const last = recentLeagueRefresh.get(`${id}:${dateKey}`) ?? 0;
        return nowMs - last > LIVE_REFRESH_COOLDOWN_MS;
      });

  if (leaguesToFetchIds.length === 0) return 0;

  for (const id of leaguesToFetchIds) {
    recentLeagueRefresh.set(`${id}:${dateKey}`, nowMs);
  }

  try {
    const provider = new EspnSoccerProvider();
    const providerMeta = {
      slug: provider.code,
      name: provider.name,
      baseUrl: "https://site.api.espn.com",
      dailyQuotaLimit: 5000,
      quotaReserve: 50,
    };
    const seasonYear = currentFootballSeasonYear(new Date(params.fromDateIso));

    return await withAppDb({ scope: "ai_pipeline" }, async (db) => {
      const providerRow = await ensureProviderAndLeagues(db, providerMeta);
      const targetLeagues = await db
        .select()
        .from(leagues)
        .where(and(eq(leagues.providerId, providerRow.id), inArray(leagues.id, leaguesToFetchIds)));

      if (targetLeagues.length === 0) return 0;

      const [run] = await db
        .insert(ingestionRuns)
        .values({
          providerId: providerRow.id,
          jobName: "ingest-fixtures",
          status: "running",
        })
        .returning();

      let requestsMade = 0;
      let itemsUpserted = 0;

      const fetched = await Promise.all(
        targetLeagues.map(async (league) => {
          try {
            const res = await provider.fetchFixturesForDateRange({
              leagueExternalId: league.externalId,
              seasonYear,
              fromDateIso: params.fromDateIso,
              toDateIso: params.toDateIso,
            });
            return { league, res };
          } catch {
            return { league, res: null };
          }
        }),
      );

      for (const { league, res } of fetched) {
        if (!res) continue;
        requestsMade += res.requestsMade;
        if (res.items.length === 0) continue;

        recordLiveTelemetryFromItems(res.items);

        const [season] = await db
          .insert(seasons)
          .values({
            providerId: providerRow.id,
            leagueId: league.id,
            year: seasonYear,
            isCurrent: true,
          })
          .onConflictDoUpdate({
            target: [seasons.leagueId, seasons.year],
            set: { isCurrent: true },
          })
          .returning();
        if (!season || !run) continue;

        itemsUpserted += await upsertNormalizedFixtures({
          db,
          providerId: providerRow.id,
          leagueId: league.id,
          seasonId: season.id,
          ingestionRunId: run.id,
          items: res.items,
        });
      }

      if (run) {
        await db
          .update(ingestionRuns)
          .set({
            status: "completed",
            requestsMade,
            itemsUpserted,
            finishedAt: new Date(),
          })
          .where(eq(ingestionRuns.id, run.id));
      }

      return itemsUpserted;
    });
  } catch {
    return 0;
  }
}
