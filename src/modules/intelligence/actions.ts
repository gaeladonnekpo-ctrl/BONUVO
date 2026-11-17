"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/server/audit/log";
import { requireActionPermission } from "@/server/auth/guards";
import { runAggregateMetricsJob } from "@/modules/intelligence/aggregate-service";

export interface AggregationActionState {
  ok: boolean;
  message: string;
}

export async function replayMetricsAggregationAction(
  formData: FormData,
): Promise<AggregationActionState> {
  const actor = await requireActionPermission("conversions.manage");
  const fromDate = String(formData.get("fromDate") ?? "").trim() || undefined;
  const toDate = String(formData.get("toDate") ?? "").trim() || undefined;

  const result = await runAggregateMetricsJob({
    fromDate,
    toDate,
    actorId: actor.id,
    dbScope: "user_session",
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  await logAudit({
    actorId: actor.id,
    action: "stats.aggregate_replay",
    entityType: "daily_metrics",
    afterState: {
      fromDate: result.fromDate,
      toDate: result.toDate,
      rowsWritten: result.rowsWritten,
      uniqueDays: result.uniqueDays,
    },
  });

  revalidatePath("/[locale]/admin/statistiques", "page");
  return {
    ok: true,
    message: `Agrégat recalculé (${result.rowsWritten} lignes sur ${result.uniqueDays} jour(s)).`,
  };
}
