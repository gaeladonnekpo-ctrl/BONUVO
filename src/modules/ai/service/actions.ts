"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { assertNoForbiddenTerms } from "@/modules/ai/model/language-guard";
import { runIngestFixturesJob, runIngestStatsJob } from "@/modules/ai/service/ingestion-service";
import {
  runComputePredictionsJob,
  runSettlePredictionsJob,
} from "@/modules/ai/service/prediction-service";
import { logAudit } from "@/server/audit/log";
import { requireActionPermission } from "@/server/auth/guards";
import { invalidatePublicCatalogTags } from "@/server/cache/catalog-tags";
import { withAppDb } from "@/server/db/context";
import { getServerEnv } from "@/server/env";
import { leagues, predictions } from "@/server/db/schema";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";

const leagueToggleSchema = z.object({
  leagueId: z.string().uuid(),
  tracked: z.boolean(),
});

const couponValidateSchema = z.object({
  predictionId: z.string().uuid(),
});

const jobNameSchema = z.enum([
  "full-sync",
  "ingest-fixtures",
  "ingest-stats",
  "compute-predictions",
  "settle-predictions",
]);

async function resolveActionIpHash(): Promise<string | null> {
  const hdrs = await headers();
  const env = getServerEnv();
  return hashIp(extractTrustedClientIp(hdrs, env.APP_ENV), env.IP_HASH_SECRET);
}

export async function toggleLeagueTrackedAction(input: { leagueId: string; tracked: boolean }) {
  const actor = await requireActionPermission("predictions.manage");
  const parsed = leagueToggleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Paramètres de ligue invalides." };
  }

  const ipHash = await resolveActionIpHash();
  await withAppDb({ scope: "user_session", actorId: actor.id }, async (db) => {
    await db
      .update(leagues)
      .set({ tracked: parsed.data.tracked, updatedAt: new Date() })
      .where(eq(leagues.id, parsed.data.leagueId));
  });

  await logAudit({
    actorId: actor.id,
    action: "ai.league.toggle_tracked",
    entityType: "leagues",
    entityId: parsed.data.leagueId,
    ipHash,
    afterState: { tracked: parsed.data.tracked },
  });

  invalidatePublicCatalogTags(["predictions"]);
  revalidatePath("/fr/admin/ingestion");
  revalidatePath("/en/admin/ingestion");
  return { ok: true as const };
}

export async function validatePredictionCouponAction(input: { predictionId: string }) {
  const actor = await requireActionPermission("predictions.manage");
  const parsed = couponValidateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Identifiant de pronostic invalide." };
  }

  const ipHash = await resolveActionIpHash();
  try {
    await withAppDb({ scope: "user_session", actorId: actor.id }, async (db) => {
      const [existing] = await db
        .select({ analysisText: predictions.analysisText })
        .from(predictions)
        .where(eq(predictions.id, parsed.data.predictionId))
        .limit(1);

      if (!existing) {
        throw new Error("PREDICTION_NOT_FOUND");
      }
      assertNoForbiddenTerms(existing.analysisText);

      await db
        .update(predictions)
        .set({
          couponValidated: true,
          validatedBy: actor.id,
          validatedAt: new Date(),
        })
        .where(eq(predictions.id, parsed.data.predictionId));
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "VALIDATION_ERROR";
    if (msg.includes("PREDICTION_LOCKED_IMMUTABLE")) {
      return {
        ok: false as const,
        error: "Validation impossible : match déjà commencé ou coupon déjà validé.",
      };
    }
    return { ok: false as const, error: msg };
  }

  await logAudit({
    actorId: actor.id,
    action: "ai.prediction.validate_coupon",
    entityType: "predictions",
    entityId: parsed.data.predictionId,
    ipHash,
    afterState: { couponValidated: true },
  });

  invalidatePublicCatalogTags(["predictions"]);
  revalidatePath("/fr/admin/pronostics");
  revalidatePath("/en/admin/pronostics");
  return { ok: true as const };
}

export async function triggerAiJobAction(input: { jobName: string }) {
  const actor = await requireActionPermission("predictions.manage");
  const parsed = jobNameSchema.safeParse(input.jobName);
  if (!parsed.success) {
    return { ok: false as const, error: "Tâche IA inconnue." };
  }

  const ipHash = await resolveActionIpHash();
  let result: unknown;

  if (parsed.data === "full-sync") {
    const fixturesRes = await runIngestFixturesJob({ dbScope: "ai_pipeline" });
    const statsRes = await runIngestStatsJob({ dbScope: "ai_pipeline" });
    const computeRes = await runComputePredictionsJob({ dbScope: "ai_pipeline" });
    const settleRes = await runSettlePredictionsJob({ dbScope: "ai_pipeline" });
    result = { fixturesRes, statsRes, computeRes, settleRes };
  } else if (parsed.data === "ingest-fixtures") {
    result = await runIngestFixturesJob({ dbScope: "ai_pipeline" });
  } else if (parsed.data === "ingest-stats") {
    result = await runIngestStatsJob({ dbScope: "ai_pipeline" });
  } else if (parsed.data === "compute-predictions") {
    result = await runComputePredictionsJob({ dbScope: "ai_pipeline" });
  } else {
    result = await runSettlePredictionsJob({ dbScope: "ai_pipeline" });
  }

  await logAudit({
    actorId: actor.id,
    action: `ai.manual_trigger.${parsed.data}`,
    entityType: "ingestion_runs",
    ipHash,
    afterState: result as Record<string, unknown>,
  });

  revalidatePath("/fr/admin/pronostics");
  revalidatePath("/en/admin/pronostics");
  revalidatePath("/fr/admin/ingestion");
  revalidatePath("/en/admin/ingestion");
  return { ok: true as const, result };
}
