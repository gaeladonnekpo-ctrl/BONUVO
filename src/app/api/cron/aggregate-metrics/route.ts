import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runAggregateMetricsJob } from "@/modules/intelligence/aggregate-service";
import { logAudit, logSecurityEvent } from "@/server/audit/log";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";

function extractCronToken(request: NextRequest): string {
  const auth = request.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return (request.headers.get("x-cron-secret") ?? "").trim();
}

function constantTimeMatch(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const ipHash = hashIp(extractTrustedClientIp(request.headers, env.APP_ENV), env.IP_HASH_SECRET);
  const expected = env.CRON_SECRET ?? "";
  const provided = extractCronToken(request);

  if (!expected) {
    return NextResponse.json(
      { error: { code: "CRON_NOT_CONFIGURED", message: "Secret de planification absent." } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!constantTimeMatch(provided, expected)) {
    await logSecurityEvent({
      eventType: "cron_unauthorized",
      severity: "high",
      ipHash,
      route: "/api/cron/aggregate-metrics",
      details: { reason: "invalid_or_missing_secret" },
    });
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Jeton de planification invalide." } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: { fromDate?: string; toDate?: string } = {};
  try {
    const text = await request.text();
    if (text.length > 4096) {
      return NextResponse.json(
        { error: { code: "PAYLOAD_TOO_LARGE", message: "Corps supérieur à 4 Ko." } },
        { status: 413, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (text.trim()) {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object") {
        body = {
          fromDate:
            typeof (parsed as { fromDate?: unknown }).fromDate === "string"
              ? (parsed as { fromDate: string }).fromDate
              : undefined,
          toDate:
            typeof (parsed as { toDate?: unknown }).toDate === "string"
              ? (parsed as { toDate: string }).toDate
              : undefined,
        };
      }
    }
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Corps JSON invalide." } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await runAggregateMetricsJob({
    fromDate: body.fromDate,
    toDate: body.toDate,
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
    ipHash,
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
