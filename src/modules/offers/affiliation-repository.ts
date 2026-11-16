import "server-only";

import { asc, desc, eq, isNull } from "drizzle-orm";
import { withAppDb } from "@/server/db/context";
import {
  affiliateLinks,
  affiliateNetworks,
  bookmakers,
  countries,
  offers,
} from "@/server/db/schema";

export async function listAffiliateNetworksRepo(actorId: string) {
  return withAppDb({ scope: "user_session", actorId }, async (tx) =>
    tx
      .select()
      .from(affiliateNetworks)
      .where(isNull(affiliateNetworks.deletedAt))
      .orderBy(asc(affiliateNetworks.name)),
  );
}

export async function listAffiliateLinksRepo(actorId: string) {
  return withAppDb({ scope: "user_session", actorId }, async (tx) =>
    tx
      .select({
        id: affiliateLinks.id,
        slug: affiliateLinks.slug,
        bookmakerId: affiliateLinks.bookmakerId,
        bookmakerName: bookmakers.name,
        countryId: affiliateLinks.countryId,
        countryCode: countries.code,
        offerId: affiliateLinks.offerId,
        offerTitleFr: offers.titleFr,
        networkId: affiliateLinks.networkId,
        networkName: affiliateNetworks.name,
        destinationUrl: affiliateLinks.destinationUrl,
        allowedHost: affiliateLinks.allowedHost,
        active: affiliateLinks.active,
        status: affiliateLinks.status,
        updatedAt: affiliateLinks.updatedAt,
      })
      .from(affiliateLinks)
      .innerJoin(bookmakers, eq(affiliateLinks.bookmakerId, bookmakers.id))
      .leftJoin(countries, eq(affiliateLinks.countryId, countries.id))
      .leftJoin(offers, eq(affiliateLinks.offerId, offers.id))
      .leftJoin(affiliateNetworks, eq(affiliateLinks.networkId, affiliateNetworks.id))
      .where(isNull(affiliateLinks.deletedAt))
      .orderBy(desc(affiliateLinks.updatedAt)),
  );
}
