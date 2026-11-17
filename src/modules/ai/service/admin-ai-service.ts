import { desc, eq, inArray } from "drizzle-orm";
import { ensureDefaultProviderAndLeagues } from "@/modules/ai/service/ingestion-helpers";
import { withAppDb } from "@/server/db/context";
import { getServerEnv } from "@/server/env";
import {
  fixtures,
  ingestionRuns,
  leagues,
  predictionResults,
  predictions,
  teams,
} from "@/server/db/schema";

export async function getAdminPredictionsOverview(actorId: string) {
  return withAppDb({ scope: "user_session", actorId }, async (db) => {
    const predRows = await db
      .select()
      .from(predictions)
      .orderBy(desc(predictions.createdAt))
      .limit(50);

    if (predRows.length === 0) {
      return { items: [], total: 0 };
    }

    const fixtureIds = Array.from(new Set(predRows.map((p) => p.fixtureId)));
    const fixRows = await db.select().from(fixtures).where(inArray(fixtures.id, fixtureIds));
    const teamIds = Array.from(new Set(fixRows.flatMap((f) => [f.homeTeamId, f.awayTeamId])));
    const leagueIds = Array.from(new Set(fixRows.map((f) => f.leagueId)));

    const [teamRows, leagueRows, resRows] = await Promise.all([
      db.select().from(teams).where(inArray(teams.id, teamIds)),
      db.select().from(leagues).where(inArray(leagues.id, leagueIds)),
      db.select().from(predictionResults).where(inArray(predictionResults.fixtureId, fixtureIds)),
    ]);

    const fixMap = new Map(fixRows.map((f) => [f.id, f]));
    const teamMap = new Map(teamRows.map((t) => [t.id, t]));
    const leagueMap = new Map(leagueRows.map((l) => [l.id, l]));
    const resMap = new Map(resRows.map((r) => [r.predictionId, r]));

    const items = predRows.map((p) => {
      const fix = fixMap.get(p.fixtureId);
      const res = resMap.get(p.id);
      return {
        id: p.id,
        fixtureId: p.fixtureId,
        leagueName: fix ? (leagueMap.get(fix.leagueId)?.name ?? "Football") : "Football",
        matchLabel: fix
          ? `${teamMap.get(fix.homeTeamId)?.name ?? "Home"} vs ${teamMap.get(fix.awayTeamId)?.name ?? "Away"}`
          : "Match",
        kickoffAt: fix ? fix.kickoffAt.toISOString() : p.createdAt.toISOString(),
        fixtureStatus: fix?.fixtureStatus ?? "scheduled",
        market: p.market,
        pickedSelection: p.pickedSelection,
        confidenceLevel: p.confidenceLevel,
        confidenceScore: Number(p.confidenceScore),
        couponValidated: p.couponValidated,
        lockedAt: p.lockedAt ? p.lockedAt.toISOString() : null,
        verdict: res?.verdict ?? null,
        brierScore:
          res?.brierScore !== null && res?.brierScore !== undefined ? Number(res.brierScore) : null,
      };
    });

    return { items, total: items.length };
  });
}

export async function getAdminIngestionOverview(actorId: string) {
  const env = getServerEnv();
  const providerConfigured = Boolean(env.API_FOOTBALL_KEY?.trim());
  const llmEnabled = Boolean(env.AI_LLM_ENABLED && env.GEMINI_API_KEY?.trim());

  return withAppDb({ scope: "user_session", actorId }, async (db) => {
    const providerRow = await ensureDefaultProviderAndLeagues(db);
    const [leagueRows, runRows] = await Promise.all([
      db
        .select()
        .from(leagues)
        .where(eq(leagues.providerId, providerRow.id))
        .orderBy(leagues.priorityOrder),
      db.select().from(ingestionRuns).orderBy(desc(ingestionRuns.startedAt)).limit(20),
    ]);

    return {
      providerConfigured,
      llmEnabled,
      provider: providerRow,
      leagues: leagueRows,
      runs: runRows.map((r) => ({
        ...r,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
      })),
    };
  });
}
