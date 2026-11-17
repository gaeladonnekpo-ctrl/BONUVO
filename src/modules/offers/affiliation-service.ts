import "server-only";

import { eq } from "drizzle-orm";
import { logAudit } from "@/server/audit/log";
import { requirePermission } from "@/server/auth/permissions";
import type { AuthenticatedUser } from "@/server/auth/session";
import { withAppDb } from "@/server/db/context";
import { affiliateLinks, affiliateNetworks, bookmakers } from "@/server/db/schema";
import {
  listAffiliateLinksRepo,
  listAffiliateNetworksRepo,
} from "@/modules/offers/affiliation-repository";
import { affiliateLinkSchema, affiliateNetworkSchema } from "@/modules/offers/schema";
import { validateAffiliateUrl } from "@/modules/offers/url-guard";

export async function listAffiliateDataForAdmin(actor: AuthenticatedUser) {
  requirePermission(actor, "offers.read");
  const [networks, links] = await Promise.all([
    listAffiliateNetworksRepo(actor.id),
    listAffiliateLinksRepo(actor.id),
  ]);
  return { networks, links };
}

export async function upsertAffiliateNetwork(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "links.manage");
  const parsed = affiliateNetworkSchema.parse(rawInput);
  const resolvedSlug =
    parsed.slug ||
    parsed.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const result = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    if (parsed.id) {
      const [existing] = await tx
        .select()
        .from(affiliateNetworks)
        .where(eq(affiliateNetworks.id, parsed.id));
      if (!existing) throw new Error("NETWORK_NOT_FOUND");
      const [updated] = await tx
        .update(affiliateNetworks)
        .set({
          slug: resolvedSlug,
          name: parsed.name,
          bookmakerId: parsed.bookmakerId,
          adapterKey: parsed.adapterKey,
          trackingMode: parsed.trackingMode,
          subIdParamName: parsed.subIdParamName,
          secretEnvRef: parsed.secretEnvRef,
          signatureMode: parsed.signatureMode,
          signatureHeader: parsed.signatureHeader,
          allowedIps: parsed.allowedIps,
          timestampToleranceSeconds: parsed.timestampToleranceSeconds,
          status: parsed.status,
        })
        .where(eq(affiliateNetworks.id, parsed.id))
        .returning();
      if (!updated) throw new Error("NETWORK_UPDATE_FAILED");
      return { beforeState: existing, afterState: updated, isUpdate: true };
    }

    const [created] = await tx
      .insert(affiliateNetworks)
      .values({
        slug: resolvedSlug,
        name: parsed.name,
        bookmakerId: parsed.bookmakerId,
        adapterKey: parsed.adapterKey,
        trackingMode: parsed.trackingMode,
        subIdParamName: parsed.subIdParamName,
        secretEnvRef: parsed.secretEnvRef,
        signatureMode: parsed.signatureMode,
        signatureHeader: parsed.signatureHeader,
        allowedIps: parsed.allowedIps,
        timestampToleranceSeconds: parsed.timestampToleranceSeconds,
        status: parsed.status,
      })
      .returning();
    if (!created) throw new Error("NETWORK_INSERT_FAILED");
    return { beforeState: null, afterState: created, isUpdate: false };
  });

  await logAudit({
    actorId: actor.id,
    action: result.isUpdate ? "affiliate_network.updated" : "affiliate_network.created",
    entityType: "affiliate_networks",
    entityId: result.afterState.id,
    beforeState: result.beforeState as Record<string, unknown> | null,
    afterState: result.afterState as Record<string, unknown>,
    ipHash,
  });

  return result.afterState;
}

export async function upsertAffiliateLink(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "links.manage");
  const parsed = affiliateLinkSchema.parse(rawInput);

  const result = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [bm] = await tx
      .select({ id: bookmakers.id, allowedHosts: bookmakers.allowedHosts })
      .from(bookmakers)
      .where(eq(bookmakers.id, parsed.bookmakerId));
    if (!bm) throw new Error("BOOKMAKER_NOT_FOUND");

    const urlCheck = validateAffiliateUrl(parsed.destinationUrl, bm.allowedHosts);
    if (!urlCheck.valid || !urlCheck.normalizedUrl || !urlCheck.matchedHost) {
      throw new Error(`AFFILIATE_URL_REJECTED:${urlCheck.reason ?? "INVALID"}`);
    }

    if (parsed.id) {
      const [existing] = await tx
        .select()
        .from(affiliateLinks)
        .where(eq(affiliateLinks.id, parsed.id));
      if (!existing) throw new Error("AFFILIATE_LINK_NOT_FOUND");
      const [updated] = await tx
        .update(affiliateLinks)
        .set({
          slug: parsed.slug,
          bookmakerId: parsed.bookmakerId,
          countryId: parsed.countryId,
          offerId: parsed.offerId,
          networkId: parsed.networkId,
          destinationUrl: urlCheck.normalizedUrl,
          allowedHost: urlCheck.matchedHost,
          active: parsed.active,
          status: parsed.status,
          deletedAt: parsed.status === "archived" ? new Date() : null,
        })
        .where(eq(affiliateLinks.id, parsed.id))
        .returning();
      if (!updated) throw new Error("AFFILIATE_LINK_UPDATE_FAILED");
      return { beforeState: existing, afterState: updated, isUpdate: true };
    }

    const [created] = await tx
      .insert(affiliateLinks)
      .values({
        slug: parsed.slug,
        bookmakerId: parsed.bookmakerId,
        countryId: parsed.countryId,
        offerId: parsed.offerId,
        networkId: parsed.networkId,
        destinationUrl: urlCheck.normalizedUrl,
        allowedHost: urlCheck.matchedHost,
        active: parsed.active,
        status: parsed.status,
      })
      .returning();
    if (!created) throw new Error("AFFILIATE_LINK_INSERT_FAILED");
    return { beforeState: null, afterState: created, isUpdate: false };
  });

  await logAudit({
    actorId: actor.id,
    action: result.isUpdate ? "affiliate_link.updated" : "affiliate_link.created",
    entityType: "affiliate_links",
    entityId: result.afterState.id,
    beforeState: result.beforeState as Record<string, unknown> | null,
    afterState: result.afterState as Record<string, unknown>,
    ipHash,
  });

  return result.afterState;
}
