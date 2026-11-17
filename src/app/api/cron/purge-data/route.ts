import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { runPurgeDataJob } from "@/modules/members/purge-service";
import { logAudit } from "@/server/audit/log";
import { parseCronJsonBody, verifyCronRequest } from "@/server/security/cron-auth";

const emptySchema = z.object({}).optional().default({});

export async function POST(request: NextRequest) {
  const auth = await verifyCronRequest(request, "/api/cron/purge-data");
  if (!auth.ok) return auth.response;

  const parsed = await parseCronJsonBody(request, emptySchema);
  if (!parsed.ok) return parsed.response;

  const result = await runPurgeDataJob(new Date());

  await logAudit({
    action: "cron.purge_data",
    entityType: "account_deletion_requests",
    ipHash: auth.ipHash,
    afterState: {
      processedCount: result.processedCount,
      anonymizedUserIdsCount: result.anonymizedUserIds.length,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      processedCount: result.processedCount,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
