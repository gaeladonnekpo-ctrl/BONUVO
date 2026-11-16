import "server-only";

import { randomUUID } from "node:crypto";
import { withAppDb } from "@/server/db/context";
import { visitEvents } from "@/server/db/schema";
import { getServerEnv } from "@/server/env";
import { publicEventInputSchema } from "@/modules/offers/public-schema";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";
import { createUpstashRateLimitBackend } from "@/server/security/rate-limit";
import { inspectVisitorRequest } from "@/server/tracking/bot-detect";

export type RecordPublicEventResult =
  | { ok: true; recorded: true }
  | { ok: false; status: 400 | 429; code: string; message: string; retryAfterSeconds?: number };

export async function recordPublicEvent(params: {
  rawBody: unknown;
  fallbackCountryCode: string;
  headers: Pick<Headers, "get">;
}): Promise<RecordPublicEventResult> {
  const parsed = publicEventInputSchema.safeParse(params.rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_EVENT",
      message: parsed.error.issues[0]?.message ?? "Événement invalide.",
    };
  }

  const env = getServerEnv();
  const clientIp = extractTrustedClientIp(params.headers, env.APP_ENV);
  const ipHash = hashIp(clientIp, env.IP_HASH_SECRET) ?? "missing-secret";

  const rlBackend = createUpstashRateLimitBackend();
  const rlDecision = rlBackend
    ? await rlBackend.consume("public_events", ipHash)
    : { allowed: true, configured: false, remaining: 60, retryAfterSeconds: 0, newlyLocked: false };
  if (!rlDecision.allowed) {
    return {
      ok: false,
      status: 429,
      code: "RATE_LIMITED",
      message: "Trop de requêtes sur la collecte d'événements.",
      retryAfterSeconds: rlDecision.retryAfterSeconds,
    };
  }

  const fingerprint = inspectVisitorRequest({
    headers: params.headers,
    ip: clientIp,
    secret: env.IP_HASH_SECRET ?? "local-dev-ip-hash-secret",
  });

  await withAppDb({ scope: "public_tracking" }, async (tx) => {
    await tx.insert(visitEvents).values({
      id: randomUUID(),
      eventType: parsed.data.eventType,
      path: parsed.data.path,
      offerId: parsed.data.offerId ?? null,
      bookmakerId: parsed.data.bookmakerId ?? null,
      promoCodeId: parsed.data.promoCodeId ?? null,
      countryCode: (parsed.data.countryCode ?? params.fallbackCountryCode).toUpperCase(),
      deviceType: fingerprint.deviceType,
      visitorDailyHash: fingerprint.visitorDailyHash,
      isBot: fingerprint.isBot,
    });
  });

  return { ok: true, recorded: true };
}
