import { NextResponse, type NextRequest } from "next/server";
import {
  subscribeToNewsletter,
  unsubscribeNewsletterByEmail,
} from "@/modules/members/newsletter-service";
import { logAudit } from "@/server/audit/log";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";
import { checkSameOrigin } from "@/server/security/origin";
import {
  createTestRateLimitBackend,
  createUpstashRateLimitBackend,
} from "@/server/security/rate-limit";

const MAX_BODY_BYTES = 8 * 1024;
let fallbackLimiter: ReturnType<typeof createTestRateLimitBackend> | null = null;

function getNewsletterLimiter() {
  const upstash = createUpstashRateLimitBackend();
  if (upstash) return upstash;
  if (!fallbackLimiter) fallbackLimiter = createTestRateLimitBackend();
  return fallbackLimiter;
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const originCheck = checkSameOrigin(request.headers, env.NEXT_PUBLIC_SITE_URL);
  if (!originCheck.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN_ORIGIN", message: "Origine non autorisée." } },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const ipHash = hashIp(extractTrustedClientIp(request.headers, env.APP_ENV)) ?? "00000000";
  const rl = await getNewsletterLimiter().consume("newsletter_crm", ipHash);

  if (!rl.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: "Trop de tentatives. Veuillez patienter quelques instants.",
        },
      },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rl.retryAfterSeconds),
        },
      },
    );
  }

  let rawText = "";
  try {
    rawText = await request.text();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_BODY", message: "Corps de requête illisible." } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (Buffer.byteLength(rawText, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: { code: "PAYLOAD_TOO_LARGE", message: "Données trop volumineuses." } },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_JSON", message: "Format JSON invalide." } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (payload.action === "unsubscribe") {
    const unsub = await unsubscribeNewsletterByEmail(String(payload.email ?? ""));
    if (!unsub.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: unsub.code, message: "Veuillez saisir une adresse e-mail valide." },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { ok: true, unsubscribed: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await subscribeToNewsletter(payload, ipHash);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: { code: result.code, message: result.message } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  await logAudit({
    actorId: null,
    action: "newsletter.subscribe",
    entityType: "newsletter_subscribers",
    entityId: result.subscriberId,
    ipHash,
    afterState: {
      countryCode: result.countryCode,
      alreadySubscribed: result.alreadySubscribed,
      reactivated: result.reactivated,
    },
  });

  const locale = payload.locale === "en" ? "en" : "fr";
  const unsubscribeUrl = `/${locale}/desinscription?token=${encodeURIComponent(result.unsubscribeToken)}`;

  return NextResponse.json(
    {
      ok: true,
      subscriberId: result.subscriberId,
      alreadySubscribed: result.alreadySubscribed,
      reactivated: result.reactivated,
      unsubscribeUrl,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
