import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { logSecurityEvent } from "@/server/audit/log";
import { withAppDb } from "@/server/db/context";
import {
  affiliateLinks,
  affiliateNetworks,
  bookmakerCountries,
  bookmakers,
  campaigns,
  clicks,
  countries,
  offerCountries,
  offers,
} from "@/server/db/schema";
import { getServerEnv } from "@/server/env";
import { goCampaignCodeSchema, goRedirectSlugSchema } from "@/modules/offers/public-schema";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";
import { createUpstashRateLimitBackend } from "@/server/security/rate-limit";
import { inspectVisitorRequest } from "@/server/tracking/bot-detect";
import { buildPartnerRedirectUrl } from "@/server/tracking/redirect-builder";

export type GoRedirectResult =
  | {
      kind: "redirect";
      location: string;
      publicClickId: string;
      isBot: boolean;
      isSuspect: boolean;
    }
  | { kind: "not_found" }
  | { kind: "rate_limited"; retryAfterSeconds: number };

const SUSPECT_BURST_THRESHOLD_REMAINING = 8;

export async function resolveAndTrackGoRedirect(params: {
  rawSlug: string;
  countryCode: string;
  rawCampaignCode?: string | null;
  headers: Pick<Headers, "get">;
}): Promise<GoRedirectResult> {
  const slugParsed = goRedirectSlugSchema.safeParse(params.rawSlug);
  if (!slugParsed.success) {
    return { kind: "not_found" };
  }
  const slug = slugParsed.data;

  const env = getServerEnv();
  const clientIp = extractTrustedClientIp(params.headers, env.APP_ENV);
  const ipHash = hashIp(clientIp, env.IP_HASH_SECRET) ?? "missing-secret";

  const rlBackend = createUpstashRateLimitBackend();
  const rlDecision = rlBackend
    ? await rlBackend.consume("go_redirect", ipHash)
    : { allowed: true, configured: false, remaining: 30, retryAfterSeconds: 0, newlyLocked: false };
  if (!rlDecision.allowed) {
    await logSecurityEvent({
      eventType: "go_redirect_rate_limited",
      severity: "warning",
      ipHash,
      route: `/go/${slug}`,
      details: { retryAfterSeconds: rlDecision.retryAfterSeconds },
    });
    return { kind: "rate_limited", retryAfterSeconds: rlDecision.retryAfterSeconds };
  }

  const campaignParsed = params.rawCampaignCode
    ? goCampaignCodeSchema.safeParse(params.rawCampaignCode)
    : null;
  const campaignCode = campaignParsed?.success ? campaignParsed.data : null;
  const fingerprint = inspectVisitorRequest({
    headers: params.headers,
    ip: clientIp,
    secret: env.IP_HASH_SECRET ?? "local-dev-ip-hash-secret",
  });

  const isBurstSuspect =
    rlDecision.configured && rlDecision.remaining <= SUSPECT_BURST_THRESHOLD_REMAINING;
  const isSuspect = isBurstSuspect;
  const botReason = isBurstSuspect
    ? [fingerprint.botReason, "burst_frequency"].filter(Boolean).join(",")
    : fingerprint.botReason;

  const publicClickId = `clk_${randomUUID().replace(/-/g, "")}`;
  const clickId = randomUUID();
  const requestedCountry = params.countryCode.trim().toUpperCase() || "GLOBAL";

  const outcome = await withAppDb({ scope: "public_tracking" }, async (tx) => {
    const [row] = await tx
      .select({
        link: affiliateLinks,
        bookmaker: bookmakers,
        network: affiliateNetworks,
        offer: offers,
        linkCountryCode: countries.code,
      })
      .from(affiliateLinks)
      .innerJoin(bookmakers, eq(bookmakers.id, affiliateLinks.bookmakerId))
      .leftJoin(affiliateNetworks, eq(affiliateNetworks.id, affiliateLinks.networkId))
      .leftJoin(offers, eq(offers.id, affiliateLinks.offerId))
      .leftJoin(countries, eq(countries.id, affiliateLinks.countryId))
      .where(
        and(
          eq(affiliateLinks.slug, slug),
          eq(affiliateLinks.active, true),
          eq(affiliateLinks.status, "active"),
          isNull(affiliateLinks.deletedAt),
          eq(bookmakers.status, "active"),
          isNull(bookmakers.deletedAt),
        ),
      );

    if (!row) return null;

    const now = new Date();
    if (row.link.offerId) {
      if (
        !row.offer ||
        row.offer.status !== "published" ||
        row.offer.deletedAt !== null ||
        (row.offer.validFrom && row.offer.validFrom > now) ||
        (row.offer.validUntil && row.offer.validUntil <= now)
      ) {
        return null;
      }
    }

    let resolvedCountryId = row.link.countryId ?? null;
    if (requestedCountry !== "GLOBAL") {
      if (row.linkCountryCode && row.linkCountryCode !== requestedCountry) {
        return null;
      }

      const [countryRow] = await tx
        .select({ id: countries.id })
        .from(countries)
        .where(and(eq(countries.code, requestedCountry), eq(countries.active, true)));

      if (!countryRow) {
        return null;
      }

      const [bmEligible] = await tx
        .select({ id: bookmakerCountries.id })
        .from(bookmakerCountries)
        .where(
          and(
            eq(bookmakerCountries.bookmakerId, row.bookmaker.id),
            eq(bookmakerCountries.countryId, countryRow.id),
            eq(bookmakerCountries.eligible, true),
            eq(bookmakerCountries.status, "active"),
            isNull(bookmakerCountries.deletedAt),
          ),
        );
      if (!bmEligible) return null;

      if (row.offer) {
        const [offerEligible] = await tx
          .select({ id: offerCountries.id })
          .from(offerCountries)
          .where(
            and(
              eq(offerCountries.offerId, row.offer.id),
              eq(offerCountries.countryId, countryRow.id),
            ),
          );
        if (!offerEligible) return null;
      }

      resolvedCountryId = countryRow.id;
    }

    const built = buildPartnerRedirectUrl({
      destinationUrl: row.link.destinationUrl,
      allowedHosts: row.bookmaker.allowedHosts,
      subIdParamName: row.network?.subIdParamName ?? "subid",
      publicClickId,
    });
    if (!built.valid || !built.url) {
      return null;
    }

    let campaignId: string | null = null;
    if (campaignCode) {
      const [camp] = await tx
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(
          and(
            eq(campaigns.code, campaignCode),
            eq(campaigns.status, "active"),
            isNull(campaigns.deletedAt),
          ),
        );
      campaignId = camp?.id ?? null;
    }

    await tx.insert(clicks).values({
      id: clickId,
      publicClickId,
      affiliateLinkId: row.link.id,
      bookmakerId: row.bookmaker.id,
      offerId: row.link.offerId ?? null,
      countryId: resolvedCountryId,
      campaignId,
      campaignCode,
      countryCode: requestedCountry,
      deviceType: fingerprint.deviceType,
      referrerHost: fingerprint.referrerHost,
      ipHash,
      anonSessionHash: fingerprint.anonSessionHash,
      isBot: fingerprint.isBot,
      isSuspect,
      botReason,
      userAgent: fingerprint.userAgentTruncated,
    });

    return {
      location: built.url,
      publicClickId,
      isBot: fingerprint.isBot,
      isSuspect,
    };
  });

  if (!outcome) {
    return { kind: "not_found" };
  }

  return { kind: "redirect", ...outcome };
}
