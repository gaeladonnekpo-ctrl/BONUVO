import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { runComputePredictionsJob } from "@/modules/ai/service/prediction-service";
import { logAudit } from "@/server/audit/log";
import { parseCronJsonBody, verifyCronRequest } from "@/server/security/cron-auth";

const emptySchema = z.object({}).optional().default({});

export async function POST(request: NextRequest) {
  const auth = await verifyCronRequest(request, "/api/cron/compute-predictions");
  if (!auth.ok) return auth.response;

  const parsed = await parseCronJsonBody(request, emptySchema);
  if (!parsed.ok) return parsed.response;

  const result = await runComputePredictionsJob({ dbScope: "ai_pipeline" });
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: result.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  await logAudit({
    action: "cron.compute_predictions",
    entityType: "predictions",
    ipHash: auth.ipHash,
    afterState: result,
  });

  return NextResponse.json(result, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
