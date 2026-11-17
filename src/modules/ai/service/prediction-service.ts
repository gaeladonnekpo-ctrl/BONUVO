import { and, desc, eq, gt, inArray, lte } from "drizzle-orm";
import { generateVerifiedAnalysisText } from "@/modules/ai/model/language-guard";
import {
  DEFAULT_LEAGUE_AWAY_AVG,
  DEFAULT_LEAGUE_HOME_AVG,
  MODEL_VERSION_TAG,
  predictFixtureMarkets,
  type TeamModelInput,
} from "@/modules/ai/model/poisson";
import { runSettlePredictionsJob } from "@/modules/ai/service/settlement-service";
import { resolveJobLockBackend } from "@/modules/intelligence/lock";
import { invalidatePublicCatalogTags } from "@/server/cache/catalog-tags";
import { withAppDb, type AppDbTransaction, type DbExecutionScope } from "@/server/db/context";
import {
  fixtures,
  modelVersions,
  predictions,
  standings,
  teamStatsSnapshots,
  teams,
} from "@/server/db/schema";

export { runSettlePredictionsJob };

export async function ensureActiveModelVersion(db: AppDbTransaction) {
  const [model] = await db
    .insert(modelVersions)
    .values({
      versionTag: MODEL_VERSION_TAG,
      description: "Modèle Poisson bivarié déterministe BONUVO v1.0 (seuil >= 6 matchs)",
      parametersJson: {
        minMatches: 6,
        maxGoals: 10,
        defaultHomeAvg: DEFAULT_LEAGUE_HOME_AVG,
        defaultAwayAvg: DEFAULT_LEAGUE_AWAY_AVG,
      },
      active: true,
    })
    .onConflictDoUpdate({
      target: modelVersions.versionTag,
      set: { active: true, updatedAt: new Date() },
    })
    .returning();
  if (!model) {
    throw new Error("MODEL_VERSION_UPSERT_FAILED");
  }
  return model;
}

export async function runComputePredictionsJob(options?: {
  dbScope?: DbExecutionScope;
  invalidateCache?: boolean;
}) {
  const scope = options?.dbScope ?? "ai_pipeline";
  const lock = resolveJobLockBackend();
  if (!lock) {
    return {
      ok: false as const,
      status: 503,
      code: "LOCK_BACKEND_UNAVAILABLE",
      message: "Verrou Redis requis.",
    };
  }
  const lockToken = await lock.acquire("ai:compute-predictions", 300);
  if (!lockToken) {
    return {
      ok: false as const,
      status: 409,
      code: "JOB_LOCKED",
      message: "Calcul déjà en cours.",
    };
  }

  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + 72 * 3600_000);

    const summary = await withAppDb({ scope }, async (db) => {
      const model = await ensureActiveModelVersion(db);
      const upcoming = await db
        .select()
        .from(fixtures)
        .where(
          and(
            eq(fixtures.fixtureStatus, "scheduled"),
            gt(fixtures.kickoffAt, now),
            lte(fixtures.kickoffAt, horizon),
          ),
        );

      if (upcoming.length === 0) {
        return {
          evaluatedFixtures: 0,
          predictionsCreated: 0,
          skippedInsufficientData: 0,
          skippedAlreadyComputed: 0,
        };
      }

      const fixtureIds = upcoming.map((f) => f.id);
      const teamIds = Array.from(new Set(upcoming.flatMap((f) => [f.homeTeamId, f.awayTeamId])));
      const seasonIds = Array.from(new Set(upcoming.map((f) => f.seasonId)));

      const [existingPreds, teamRows, statRows, standingRows] = await Promise.all([
        db
          .select({ fixtureId: predictions.fixtureId, market: predictions.market })
          .from(predictions)
          .where(
            and(
              eq(predictions.modelVersionId, model.id),
              inArray(predictions.fixtureId, fixtureIds),
            ),
          ),
        db.select().from(teams).where(inArray(teams.id, teamIds)),
        db
          .select()
          .from(teamStatsSnapshots)
          .where(
            and(
              inArray(teamStatsSnapshots.teamId, teamIds),
              inArray(teamStatsSnapshots.seasonId, seasonIds),
            ),
          )
          .orderBy(desc(teamStatsSnapshots.asOfDate)),
        db
          .select()
          .from(standings)
          .where(and(inArray(standings.teamId, teamIds), inArray(standings.seasonId, seasonIds))),
      ]);

      const existingKeys = new Set(existingPreds.map((p) => `${p.fixtureId}:${p.market}`));
      const teamMap = new Map(teamRows.map((t) => [t.id, t]));
      const latestStatMap = new Map<string, (typeof statRows)[number]>();
      for (const s of statRows) {
        const key = `${s.teamId}:${s.seasonId}`;
        if (!latestStatMap.has(key)) latestStatMap.set(key, s);
      }
      const standingMap = new Map(standingRows.map((st) => [`${st.teamId}:${st.seasonId}`, st]));

      let predictionsCreated = 0;
      let skippedInsufficientData = 0;
      let skippedAlreadyComputed = 0;

      for (const fix of upcoming) {
        const hasAllMarkets = ["1x2", "over_under_25", "btts"].every((m) =>
          existingKeys.has(`${fix.id}:${m}`),
        );
        if (hasAllMarkets) {
          skippedAlreadyComputed += 1;
          continue;
        }

        const homeStat = latestStatMap.get(`${fix.homeTeamId}:${fix.seasonId}`);
        const awayStat = latestStatMap.get(`${fix.awayTeamId}:${fix.seasonId}`);
        const homeTeam = teamMap.get(fix.homeTeamId);
        const awayTeam = teamMap.get(fix.awayTeamId);
        if (!homeStat || !awayStat || !homeTeam || !awayTeam) {
          skippedInsufficientData += 1;
          continue;
        }

        const buildInput = (
          t: (typeof teamRows)[number],
          st: (typeof statRows)[number],
        ): TeamModelInput => ({
          teamId: t.id,
          teamName: t.name,
          matchesPlayed: st.matchesPlayed,
          goalsFor: st.goalsForTotal,
          goalsAgainst: st.goalsAgainstTotal,
          homeMatches: st.homeMatchesPlayed,
          homeGoalsFor: st.homeGoalsFor,
          homeGoalsAgainst: st.homeGoalsAgainst,
          awayMatches: st.awayMatchesPlayed,
          awayGoalsFor: st.awayGoalsFor,
          awayGoalsAgainst: st.awayGoalsAgainst,
          recentForm: standingMap.get(`${t.id}:${fix.seasonId}`)?.formText ?? null,
        });

        const homeInput = buildInput(homeTeam, homeStat);
        const awayInput = buildInput(awayTeam, awayStat);
        const computed = predictFixtureMarkets({
          fixtureId: fix.id,
          home: homeInput,
          away: awayInput,
        });
        if (!computed.eligible) {
          skippedInsufficientData += 1;
          continue;
        }

        const lockTime = new Date();
        for (const m of computed.markets) {
          if (existingKeys.has(`${fix.id}:${m.market}`)) continue;
          const narrative = await generateVerifiedAnalysisText({
            fallbackText: m.analysisText,
            facts: {
              homeMatches: homeInput.matchesPlayed,
              homeGoalsFor: homeInput.goalsFor,
              homeGoalsAgainst: homeInput.goalsAgainst,
              awayMatches: awayInput.matchesPlayed,
              awayGoalsFor: awayInput.goalsFor,
              awayGoalsAgainst: awayInput.goalsAgainst,
              expectedHomeGoals: computed.expectedHomeGoals,
              expectedAwayGoals: computed.expectedAwayGoals,
              probabilities: m.probabilities,
            },
          });

          await db
            .insert(predictions)
            .values({
              fixtureId: fix.id,
              modelVersionId: model.id,
              market: m.market,
              probabilitiesJson: m.probabilities,
              pickedSelection: m.recommendedPick,
              confidenceLevel: m.confidenceTier,
              confidenceScore: m.confidenceScore.toFixed(4),
              expectedHomeGoals: computed.expectedHomeGoals.toFixed(3),
              expectedAwayGoals: computed.expectedAwayGoals.toFixed(3),
              inputSnapshotHash: computed.inputSnapshotHash,
              homeStatsSnapshotId: homeStat.id,
              awayStatsSnapshotId: awayStat.id,
              analysisText: narrative.text,
              analysisStatus: narrative.source === "llm" ? "llm_verified" : "template",
              status: "published",
              publishedAt: lockTime,
              lockedAt: lockTime,
            })
            .onConflictDoNothing();
          predictionsCreated += 1;
        }
      }

      return {
        evaluatedFixtures: upcoming.length,
        predictionsCreated,
        skippedInsufficientData,
        skippedAlreadyComputed,
      };
    });

    if (options?.invalidateCache !== false) {
      invalidatePublicCatalogTags(["predictions"]);
    }
    return { ok: true as const, ...summary };
  } finally {
    await lock.release("ai:compute-predictions", lockToken);
  }
}
