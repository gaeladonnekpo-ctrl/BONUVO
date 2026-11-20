import { NextResponse, type NextRequest } from "next/server";
import { exportReportParamSchema } from "@/modules/intelligence/schema";
import { serializeDashboardReportToCsv } from "@/modules/intelligence/stats-drilldown";
import { queryIntelligenceDashboard } from "@/modules/intelligence/stats-queries";
import { logAudit } from "@/server/audit/log";
import { requireActionPermission } from "@/server/auth/guards";
import { ForbiddenError, UnauthorizedError } from "@/server/auth/permissions";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";

export async function GET(request: NextRequest, context: { params: Promise<{ report: string }> }) {
  const { report } = await context.params;
  const parsedReport = exportReportParamSchema.safeParse(report);
  if (!parsedReport.success) {
    return NextResponse.json(
      { error: { code: "UNKNOWN_REPORT", message: "Type de rapport CSV inconnu." } },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  let actorId: string;
  let actor;
  try {
    await requireActionPermission("stats.read");
    actor = await requireActionPermission("stats.export");
    actorId = actor.id;
  } catch (error) {
    const status =
      error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 403;
    return NextResponse.json(
      {
        error: {
          code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message:
            error instanceof UnauthorizedError || error instanceof ForbiddenError
              ? error.message
              : "Accès refusé.",
        },
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sp = request.nextUrl.searchParams;
  const rawParams = {
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    country: sp.get("country") ?? undefined,
    bookmakerId: sp.get("bookmakerId") ?? undefined,
    campaignId: sp.get("campaignId") ?? undefined,
    groupBy: sp.get("groupBy") ?? undefined,
  };

  const dashboard = await queryIntelligenceDashboard(actor, rawParams);
  const csv = serializeDashboardReportToCsv(parsedReport.data, dashboard);

  const env = getServerEnv();
  const ipHash = hashIp(extractTrustedClientIp(request.headers, env.APP_ENV), env.IP_HASH_SECRET);
  await logAudit({
    actorId,
    action: "stats.export",
    entityType: "daily_metrics",
    ipHash,
    afterState: {
      report: parsedReport.data,
      fromDate: dashboard.filters.fromDate,
      toDate: dashboard.filters.toDate,
      country: dashboard.filters.country,
    },
  });

  const filename = `bonuvo-${parsedReport.data}-${dashboard.filters.fromDate}-${dashboard.filters.toDate}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
