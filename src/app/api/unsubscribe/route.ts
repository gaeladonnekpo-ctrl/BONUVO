import { NextResponse, type NextRequest } from "next/server";
import { processSignedUnsubscribe } from "@/modules/members/purge-service";
import { logAudit, logSecurityEvent } from "@/server/audit/log";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";

async function handleUnsubscribe(token: string, request: NextRequest) {
  const env = getServerEnv();
  const ipHash = hashIp(extractTrustedClientIp(request.headers, env.APP_ENV)) ?? "00000000";
  const result = await processSignedUnsubscribe({ token, ipHash });

  if (!result.ok) {
    await logSecurityEvent({
      eventType: "unsubscribe_token_rejected",
      severity: "warning",
      ipHash,
      route: "/api/unsubscribe",
      details: { reason: result.reason },
    });

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: result.reason,
          message: "Jeton de désinscription invalide, altéré ou expiré.",
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  await logAudit({
    actorId: result.userId,
    action: "member.unsubscribe.1click",
    entityType: "communication_preferences",
    entityId: result.userId,
    ipHash,
    afterState: { scope: result.scope, preferredChannel: "none" },
  });

  return NextResponse.json(
    {
      ok: true,
      scope: result.scope,
      message: "Vos préférences de communication ont été désactivées.",
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  return handleUnsubscribe(token, request);
}

export async function POST(request: NextRequest) {
  let token = request.nextUrl.searchParams.get("token") ?? "";
  if (!token) {
    try {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const body = (await request.json()) as { token?: string };
        token = String(body.token ?? "");
      } else {
        const form = await request.formData();
        token = String(form.get("token") ?? "");
      }
    } catch {
      token = "";
    }
  }
  return handleUnsubscribe(token, request);
}
