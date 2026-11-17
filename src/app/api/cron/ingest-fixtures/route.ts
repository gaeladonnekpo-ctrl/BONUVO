import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { runIngestFixturesJob } from "@/modules/ai/service/ingestion-service";
import { logAudit } from "@/server/audit/log";
import { parseCronJsonBody, verifyCronRequest } from "@/server/security/cron-auth";

const emptySchema = z.object({}).optional().default({});

export async function POST(request: NextRequest) {
  const auth = await verifyCronRequest(request, "/api/cron/ingest-fixtures");
  if (!auth.ok) return auth.response;

  const parsed = await parseCronJsonBody(request, emptySchema);
  if (!parsed.ok) return parsed.response;

  const result = await runIngestFixturesJob({ dbScope: "ai_pipeline" });
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: result.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  await logAudit({
    action: "cron.ingest_fixtures",
    entityType: "ingestion_runs",
    ipHash: auth.ipHash,
    afterState: result,
  });

  return NextResponse.json(result, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
