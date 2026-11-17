import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { runAggregateMetricsJob } from "@/modules/intelligence/aggregate-service";
import { logAudit } from "@/server/audit/log";
import { parseCronJsonBody, verifyCronRequest } from "@/server/security/cron-auth";

const bodySchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await verifyCronRequest(request, "/api/cron/aggregate-metrics");
  if (!auth.ok) return auth.response;

  const parsed = await parseCronJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const result = await runAggregateMetricsJob({
    fromDate: parsed.data.fromDate,
    toDate: parsed.data.toDate,
    dbScope: "stats_aggregator",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: result.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  await logAudit({
    action: "cron.aggregate_metrics",
    entityType: "daily_metrics",
    ipHash: auth.ipHash,
    afterState: {
      fromDate: result.fromDate,
      toDate: result.toDate,
      rowsWritten: result.rowsWritten,
      uniqueDays: result.uniqueDays,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      fromDate: result.fromDate,
      toDate: result.toDate,
      rowsWritten: result.rowsWritten,
      uniqueDays: result.uniqueDays,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
