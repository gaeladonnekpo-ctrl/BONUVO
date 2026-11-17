import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { logAudit, logSecurityEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/auth/permissions";
import type { AuthenticatedUser } from "@/server/auth/session";
import { withAppDb } from "@/server/db/context";
import {
  affiliateNetworks,
  conversions,
  postbackEvents,
  type PostbackSourceType,
} from "@/server/db/schema";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";
import { createUpstashRateLimitBackend } from "@/server/security/rate-limit";
import { getPartnerAdapter } from "./adapters";
import { sanitizeRecordForStorage } from "./adapters/security";
import { attributeAndPersistPostbackTx, toNetworkConfig } from "./postback-persist";

export interface IncomingPartnerHttpResult {
  readonly status: number;
  readonly body: Record<string, unknown>;
  readonly retryAfterSeconds?: number;
}

function headersToLowerRecord(headers: Pick<Headers, "forEach">): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

export async function handleIncomingPartnerEvent(params: {
  networkSlug: string;
  sourceType: PostbackSourceType;
  method: "GET" | "POST";
  query: Record<string, string>;
  headers: Headers;
  rawBody: string;
}): Promise<IncomingPartnerHttpResult> {
  const env = getServerEnv();
  const clientIp = extractTrustedClientIp(params.headers, env.APP_ENV);
  const ipHash = hashIp(clientIp, env.IP_HASH_SECRET) ?? "missing-secret";
  const rlRule = params.sourceType === "webhook" ? "webhook_provider" : "postback_ingest";
  const rlBackend = createUpstashRateLimitBackend();

  if (rlBackend) {
    const decision = await rlBackend.consume(rlRule, ipHash);
    if (!decision.allowed) {
      return {
        status: 429,
        retryAfterSeconds: decision.retryAfterSeconds,
        body: { error: { code: "RATE_LIMITED", message: "Trop de requêtes postback." } },
      };
    }
  }

  const normalizedSlug = params.networkSlug.trim().toLowerCase();
  const networkRow = await withAppDb({ scope: "postback_ingest" }, async (tx) => {
    const [found] = await tx
      .select()
      .from(affiliateNetworks)
      .where(
        and(
          eq(affiliateNetworks.slug, normalizedSlug),
          eq(affiliateNetworks.status, "active"),
          isNull(affiliateNetworks.deletedAt),
        ),
      );
    return found ?? null;
  });

  if (!networkRow) {
    await logSecurityEvent({
      eventType: "postback_unknown_network",
      severity: "warning",
      ipHash,
      route: `/api/${params.sourceType}s/${normalizedSlug}`,
      details: { networkSlug: normalizedSlug },
    });
    return {
      status: 404,
      body: { error: { code: "NETWORK_NOT_FOUND", message: "Réseau d'affiliation inconnu." } },
    };
  }

  const network = toNetworkConfig(networkRow);
  const adapter = getPartnerAdapter(network.adapterKey);
  const headerMap = headersToLowerRecord(params.headers);
  const verifyResult = adapter.verify({
    network,
    method: params.method,
    clientIp,
    query: params.query,
    headers: headerMap,
    rawBody: params.rawBody,
  });

  if (!verifyResult.ok) {
    await withAppDb({ scope: "postback_ingest" }, async (tx) => {
      await tx.insert(postbackEvents).values({
        networkId: network.id,
        networkSlug: normalizedSlug,
        sourceType: params.sourceType,
        rawQuery: sanitizeRecordForStorage(params.query),
        rawHeaders: sanitizeRecordForStorage(headerMap),
        rawBody: params.rawBody.slice(0, 16_384),
        signatureValid: false,
        processingStatus: "rejected",
        rejectionReason: verifyResult.reason,
        ipHash,
        eventTimestamp: verifyResult.eventTimestamp,
        processedAt: new Date(),
      });
    });

    await logSecurityEvent({
      eventType: "invalid_postback_signature",
      severity: "high",
      ipHash,
      route: `/api/${params.sourceType}s/${normalizedSlug}`,
      details: { network: normalizedSlug, reason: verifyResult.reason },
    });
    return {
      status: verifyResult.status,
      body: { error: { code: "UNAUTHORIZED", message: "Vérification partenaire refusée." } },
    };
  }

  const parsed = adapter.parse({
    query: params.query,
    rawBody: params.rawBody,
    contentType: headerMap["content-type"] ?? "",
  });
  const candidate = adapter.toConversion(parsed);

  const eventId = await withAppDb({ scope: "postback_ingest" }, async (tx) => {
    const [inserted] = await tx
      .insert(postbackEvents)
      .values({
        networkId: network.id,
        networkSlug: normalizedSlug,
        sourceType: params.sourceType,
        externalEventId: parsed.ok ? candidate.externalEventId : "",
        rawQuery: sanitizeRecordForStorage(params.query),
        rawHeaders: sanitizeRecordForStorage(headerMap),
        rawBody: params.rawBody.slice(0, 16_384),
        signatureValid: true,
        processingStatus: parsed.ok ? "received" : "rejected",
        rejectionReason: parsed.ok ? "" : (parsed.reason ?? "invalid_payload"),
        ipHash,
        eventTimestamp: verifyResult.eventTimestamp,
        processedAt: parsed.ok ? null : new Date(),
      })
      .returning({ id: postbackEvents.id });
    return inserted!.id;
  });

  if (!parsed.ok) {
    return {
      status: 400,
      body: { error: { code: "INVALID_PAYLOAD", message: parsed.reason ?? "Charge invalide." } },
    };
  }

  const processed = await withAppDb({ scope: "postback_ingest" }, (tx) =>
    attributeAndPersistPostbackTx(tx, {
      postbackEventId: eventId,
      network,
      sourceType: params.sourceType,
      parsed: candidate,
    }),
  );

  if (processed.outcome === "rejected") {
    return {
      status: 400,
      body: { error: { code: "ATTRIBUTION_ERROR", message: processed.reason ?? "Rejeté." } },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      eventId,
      duplicate: processed.outcome === "duplicate",
      conversionId: processed.conversionId ?? null,
      attributionMode: processed.attributionMode ?? null,
    },
  };
}

export async function replayPostbackEvent(
  actor: AuthenticatedUser,
  postbackEventId: string,
  ipHash: string | null,
) {
  requirePermission(actor, "conversions.manage");

  const result = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [eventRow] = await tx
      .select()
      .from(postbackEvents)
      .where(eq(postbackEvents.id, postbackEventId));
    if (!eventRow || !eventRow.networkId) throw new Error("POSTBACK_EVENT_NOT_FOUND");
    if (!eventRow.signatureValid) throw new Error("POSTBACK_SIGNATURE_INVALID");

    const [netRow] = await tx
      .select()
      .from(affiliateNetworks)
      .where(eq(affiliateNetworks.id, eventRow.networkId));
    if (!netRow) throw new Error("NETWORK_NOT_FOUND");

    const [existingForEvent] = await tx
      .select({ id: conversions.id })
      .from(conversions)
      .where(eq(conversions.postbackEventId, eventRow.id));
    if (existingForEvent) {
      return { outcome: "duplicate" as const, conversionId: existingForEvent.id };
    }

    const network = toNetworkConfig(netRow);
    const adapter = getPartnerAdapter(network.adapterKey);
    const parsed = adapter.parse({
      query: eventRow.rawQuery,
      rawBody: eventRow.rawBody,
      contentType: eventRow.rawHeaders["content-type"] ?? "",
    });
    if (!parsed.ok) throw new Error(`INVALID_REPLAY_PAYLOAD:${parsed.reason ?? "unknown"}`);

    return attributeAndPersistPostbackTx(tx, {
      postbackEventId: eventRow.id,
      network,
      sourceType: eventRow.sourceType,
      parsed: adapter.toConversion(parsed),
      isReplay: true,
    });
  });

  await logAudit({
    actorId: actor.id,
    action: "postback_event.replayed",
    entityType: "postback_events",
    entityId: postbackEventId,
    beforeState: null,
    afterState: result,
    ipHash,
  });

  return result;
}
