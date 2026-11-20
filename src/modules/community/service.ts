import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { OFFICIAL_BONUVO_CHANNELS } from "@/components/community/SocialBrandIcon";
import { PUBLIC_CATALOG_CACHE_TAGS, withCatalogCache } from "@/server/cache/catalog-tags";
import { withAppDb } from "@/server/db/context";
import { bookmakers, communityChannels, coupons, posts } from "@/server/db/schema";
import { validateCommunityChannelUrl, type CommunityPlatform } from "./channel-url";
import { normalizePostSlug, sanitizeEditorialContent } from "./sanitizer";

export type PublicChannelItem = {
  id: string;
  platform: CommunityPlatform;
  countryCode: string;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  inviteUrl: string;
  subscriberCountLabel: string;
  priorityOrder: number;
};

export type PublicCouponItem = {
  id: string;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  countryCode: string;
  bookmakerName: string | null;
  couponCode: string;
  combinedOdds: string | null;
  confidenceLabel: string;
  settlementStatus: "pending" | "won" | "lost" | "void";
  settledAt: Date | null;
  validatedAt: Date | null;
  publishedToTelegramAt: Date | null;
};

export type PublicPostItem = {
  id: string;
  slug: string;
  postType: "announcement" | "news";
  titleFr: string;
  titleEn: string;
  excerptFr: string;
  excerptEn: string;
  bodyFr: string;
  bodyEn: string;
  countryCode: string;
  featured: boolean;
  status: string;
  publishedAt: Date | null;
};

const DEFAULT_PUBLIC_CHANNELS: PublicChannelItem[] = OFFICIAL_BONUVO_CHANNELS.map((ch, idx) => ({
  id: ch.id,
  platform: ch.platform,
  countryCode: "GLOBAL",
  titleFr: ch.badgeFr,
  titleEn: ch.badgeEn,
  descriptionFr: ch.descriptionFr,
  descriptionEn: ch.descriptionEn,
  inviteUrl: ch.href,
  subscriberCountLabel: ch.labelFr,
  priorityOrder: (idx + 1) * 10,
}));

function mapPostRow(p: typeof posts.$inferSelect): PublicPostItem {
  return {
    id: p.id,
    slug: p.slug,
    postType: p.postType === "announcement" ? "announcement" : "news",
    titleFr: sanitizeEditorialContent(p.titleFr),
    titleEn: sanitizeEditorialContent(p.titleEn || p.titleFr),
    excerptFr: sanitizeEditorialContent(p.excerptFr),
    excerptEn: sanitizeEditorialContent(p.excerptEn || p.excerptFr),
    bodyFr: sanitizeEditorialContent(p.bodyFr),
    bodyEn: sanitizeEditorialContent(p.bodyEn || p.bodyFr),
    countryCode: p.countryCode,
    featured: p.featured,
    status: p.status,
    publishedAt: p.publishedAt,
  };
}

const listPublicCommunityDataCached = withCatalogCache(
  async (normalizedCountry: string) => {
    const allowedCountries =
      normalizedCountry && normalizedCountry !== "GLOBAL"
        ? ["GLOBAL", normalizedCountry]
        : undefined;

    return withAppDb({ scope: "public_catalog" }, async (tx) => {
      const [channelRows, couponRows, postRows] = await Promise.all([
        tx
          .select()
          .from(communityChannels)
          .where(
            allowedCountries
              ? and(
                  eq(communityChannels.active, true),
                  inArray(communityChannels.countryCode, allowedCountries),
                )
              : eq(communityChannels.active, true),
          )
          .orderBy(asc(communityChannels.priorityOrder), desc(communityChannels.createdAt))
          .limit(20),
        tx
          .select({
            id: coupons.id,
            titleFr: coupons.titleFr,
            titleEn: coupons.titleEn,
            descriptionFr: coupons.descriptionFr,
            descriptionEn: coupons.descriptionEn,
            countryCode: coupons.countryCode,
            bookmakerName: bookmakers.name,
            couponCode: coupons.couponCode,
            combinedOdds: coupons.combinedOdds,
            confidenceLabel: coupons.confidenceLabel,
            settlementStatus: coupons.settlementStatus,
            settledAt: coupons.settledAt,
            validatedAt: coupons.validatedAt,
            publishedToTelegramAt: coupons.publishedToTelegramAt,
          })
          .from(coupons)
          .leftJoin(bookmakers, eq(coupons.bookmakerId, bookmakers.id))
          .where(eq(coupons.status, "validated"))
          .orderBy(desc(coupons.validatedAt), desc(coupons.createdAt))
          .limit(12),
        tx
          .select()
          .from(posts)
          .where(eq(posts.status, "published"))
          .orderBy(desc(posts.featured), desc(posts.publishedAt), desc(posts.createdAt))
          .limit(24),
      ]);

      return {
        channels:
          channelRows.length > 0
            ? channelRows.map((c) => ({
                id: c.id,
                platform: c.platform as CommunityPlatform,
                countryCode: c.countryCode,
                titleFr: c.titleFr,
                titleEn: c.titleEn || c.titleFr,
                descriptionFr: c.descriptionFr,
                descriptionEn: c.descriptionEn || c.descriptionFr,
                inviteUrl: c.inviteUrl,
                subscriberCountLabel: c.subscriberCountLabel,
                priorityOrder: c.priorityOrder,
              }))
            : DEFAULT_PUBLIC_CHANNELS,
        coupons: couponRows,
        posts: postRows.map(mapPostRow),
      };
    });
  },
  ["public-community-data"],
  [PUBLIC_CATALOG_CACHE_TAGS.community],
  300,
);

export async function listPublicCommunityData(countryCode?: string) {
  return listPublicCommunityDataCached((countryCode || "GLOBAL").trim().toUpperCase());
}

export async function getPublicPostBySlug(slug: string): Promise<PublicPostItem | null> {
  const cleanSlug = normalizePostSlug(slug);
  return withAppDb({ scope: "public_catalog" }, async (tx) => {
    const [row] = await tx
      .select()
      .from(posts)
      .where(and(eq(posts.slug, cleanSlug), eq(posts.status, "published")))
      .limit(1);
    return row ? mapPostRow(row) : null;
  });
}

export async function listAdminCommunityOverview(actorId: string) {
  return withAppDb({ scope: "user_session", actorId }, async (tx) => {
    const [allChannels, allCoupons, allPosts] = await Promise.all([
      tx.select().from(communityChannels).orderBy(asc(communityChannels.priorityOrder)).limit(50),
      tx.select().from(coupons).orderBy(desc(coupons.createdAt)).limit(50),
      tx.select().from(posts).orderBy(desc(posts.createdAt)).limit(50),
    ]);
    return { channels: allChannels, coupons: allCoupons, posts: allPosts };
  });
}

export async function createOrUpdatePost(input: {
  actorId: string;
  slug?: string;
  postType: "announcement" | "news";
  titleFr: string;
  titleEn?: string;
  excerptFr?: string;
  excerptEn?: string;
  bodyFr: string;
  bodyEn?: string;
  countryCode?: string;
  featured?: boolean;
  status: "draft" | "published" | "archived";
}) {
  const safeTitleFr = sanitizeEditorialContent(input.titleFr);
  if (!safeTitleFr) throw new Error("EMPTY_POST_TITLE");
  const safeSlug = normalizePostSlug(input.slug || safeTitleFr);
  const safeTitleEn = sanitizeEditorialContent(input.titleEn || safeTitleFr);
  const safeExcerptFr = sanitizeEditorialContent(input.excerptFr ?? "");
  const safeExcerptEn = sanitizeEditorialContent(input.excerptEn || safeExcerptFr);
  const safeBodyFr = sanitizeEditorialContent(input.bodyFr);
  const safeBodyEn = sanitizeEditorialContent(input.bodyEn || safeBodyFr);
  const countryCode = (input.countryCode || "GLOBAL").toUpperCase();
  const publishedAt = input.status === "published" ? new Date() : null;

  return withAppDb({ scope: "user_session", actorId: input.actorId }, async (tx) => {
    const [row] = await tx
      .insert(posts)
      .values({
        slug: safeSlug,
        postType: input.postType,
        titleFr: safeTitleFr,
        titleEn: safeTitleEn,
        excerptFr: safeExcerptFr,
        excerptEn: safeExcerptEn,
        bodyFr: safeBodyFr,
        bodyEn: safeBodyEn,
        countryCode,
        featured: Boolean(input.featured),
        status: input.status,
        authorId: input.actorId,
        publishedAt,
      })
      .onConflictDoUpdate({
        target: posts.slug,
        set: {
          postType: input.postType,
          titleFr: safeTitleFr,
          titleEn: safeTitleEn,
          excerptFr: safeExcerptFr,
          excerptEn: safeExcerptEn,
          bodyFr: safeBodyFr,
          bodyEn: safeBodyEn,
          countryCode,
          featured: Boolean(input.featured),
          status: input.status,
          publishedAt,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row!;
  });
}

export async function createCommunityChannel(input: {
  actorId: string;
  platform: CommunityPlatform;
  countryCode?: string;
  titleFr: string;
  titleEn?: string;
  descriptionFr?: string;
  descriptionEn?: string;
  inviteUrl: string;
  subscriberCountLabel?: string;
  priorityOrder?: number;
  active?: boolean;
}) {
  const urlCheck = validateCommunityChannelUrl(input.inviteUrl, input.platform);
  if (!urlCheck.ok) throw new Error(`INVALID_CHANNEL_URL:${urlCheck.reason}`);
  const safeTitleFr = sanitizeEditorialContent(input.titleFr);
  if (!safeTitleFr) throw new Error("EMPTY_CHANNEL_TITLE");

  return withAppDb({ scope: "user_session", actorId: input.actorId }, async (tx) => {
    const [row] = await tx
      .insert(communityChannels)
      .values({
        platform: input.platform,
        countryCode: (input.countryCode || "GLOBAL").toUpperCase(),
        titleFr: safeTitleFr,
        titleEn: sanitizeEditorialContent(input.titleEn || safeTitleFr),
        descriptionFr: sanitizeEditorialContent(input.descriptionFr ?? ""),
        descriptionEn: sanitizeEditorialContent(input.descriptionEn || input.descriptionFr || ""),
        inviteUrl: urlCheck.normalizedUrl,
        subscriberCountLabel: sanitizeEditorialContent(input.subscriberCountLabel ?? ""),
        priorityOrder: input.priorityOrder ?? 100,
        active: input.active ?? true,
      })
      .returning();
    return row!;
  });
}
