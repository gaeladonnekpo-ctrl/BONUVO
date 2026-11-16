import { NextResponse, type NextRequest } from "next/server";
import { logSecurityEvent } from "@/server/audit/log";
import { verifyResendWebhook } from "@/server/email/mailer";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIdentifier, hashIp } from "@/server/security/ip";

const MAX_WEBHOOK_BYTES = 64 * 1024;

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const webhookSecret = env.RESEND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_NOT_CONFIGURED",
          message: "Webhook e-mail non configuré dans cet environnement.",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const clientIp = extractTrustedClientIp(request.headers, env.APP_ENV);
  const ipHash = hashIp(clientIp, env.IP_HASH_SECRET);
  const payload = await request.text();

  if (Buffer.byteLength(payload, "utf8") > MAX_WEBHOOK_BYTES) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Charge webhook trop volumineuse." } },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  const svixId = request.headers.get("svix-id") ?? request.headers.get("webhook-id") ?? "";
  const svixTimestamp =
    request.headers.get("svix-timestamp") ?? request.headers.get("webhook-timestamp") ?? "";
  const svixSignature =
    request.headers.get("svix-signature") ?? request.headers.get("webhook-signature") ?? "";

  if (!svixId || !svixTimestamp || !svixSignature) {
    await logSecurityEvent({
      eventType: "invalid_webhook_signature",
      severity: "high",
      ipHash,
      route: "/api/webhooks/email",
      details: { reason: "missing_signature_headers" },
    });
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Signature webhook manquante." } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const event = verifyResendWebhook({
      payload,
      headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
      webhookSecret,
    });

    const eventType = event.type;
    const recipient =
      typeof (event.data as { to?: string[] } | undefined)?.to?.[0] === "string"
        ? (event.data as { to: string[] }).to[0]
        : null;

    await logSecurityEvent({
      eventType: `email_webhook.${eventType}`,
      severity:
        eventType === "email.bounced" || eventType === "email.complained" ? "warning" : "info",
      ipHash,
      identifierHash:
        recipient && env.IP_HASH_SECRET ? hashIdentifier(recipient, env.IP_HASH_SECRET) : null,
      route: "/api/webhooks/email",
      details: { provider: "resend", eventType },
    });

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    await logSecurityEvent({
      eventType: "invalid_webhook_signature",
      severity: "high",
      ipHash,
      route: "/api/webhooks/email",
      details: { provider: "resend", reason: "verification_failed" },
    });
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Signature webhook invalide." } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
}
