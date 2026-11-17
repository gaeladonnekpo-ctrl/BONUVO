import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { logSecurityEvent } from "@/server/audit/log";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";

function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const ipHash = hashIp(extractTrustedClientIp(request.headers, env.APP_ENV));
  const configuredSecret = env.TELEGRAM_WEBHOOK_SECRET;
  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";

  if (!configuredSecret || !headerSecret || !constantTimeCompare(headerSecret, configuredSecret)) {
    await logSecurityEvent({
      eventType: "telegram_webhook_unauthorized",
      severity: "warning",
      ipHash,
      route: "/api/webhooks/telegram",
      details: { hasHeaderSecret: Boolean(headerSecret) },
    });

    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED_WEBHOOK",
          message: "Signature secrète Telegram absente ou invalide.",
        },
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Corps JSON invalide." } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      receivedUpdateId: typeof payload.update_id === "number" ? payload.update_id : null,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
