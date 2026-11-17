import { NextResponse, type NextRequest } from "next/server";
import { exportMemberPersonalData } from "@/modules/members/purge-service";
import { logAudit } from "@/server/audit/log";
import { getCurrentUser } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.emailVerified) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentification requise pour exporter vos données.",
        },
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const env = getServerEnv();
  const ipHash = hashIp(extractTrustedClientIp(request.headers, env.APP_ENV)) ?? "00000000";
  const archive = await exportMemberPersonalData({
    actorId: user.id,
    targetUserId: user.id,
    ipHash,
  });

  await logAudit({
    actorId: user.id,
    action: "member.data.export",
    entityType: "profiles",
    entityId: user.id,
    ipHash,
  });

  return new NextResponse(JSON.stringify(archive, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="bonuvo-donnees-personnelles-${user.id.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
