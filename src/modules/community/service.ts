import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
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

const DEFAULT_PUBLIC_CHANNELS: PublicChannelItem[] = [
  {
    id: "default-tg-global",
    platform: "telegram",
    countryCode: "GLOBAL",
    titleFr: "BONUVO Officiel — Pronostics & Codes Promo",
    titleEn: "BONUVO Official — Predictions & Promo Codes",
    descriptionFr:
      "Canal Telegram principal : sélections BONUVO AI vérifiées, coupons validés et alertes bonus bookmakers.",
    descriptionEn:
      "Main Telegram channel: verified BONUVO AI picks, validated coupons and bookmaker bonus alerts.",
    inviteUrl: "https://t.me/bonuvo_official",
    subscriberCountLabel: "Accès direct",
    priorityOrder: 10,
  },
  {
    id: "default-wa-channel",
    platform: "whatsapp_channel",
    countryCode: "GLOBAL",
    titleFr: "Chaîne WhatsApp BONUVO Afrique",
    titleEn: "BONUVO Africa WhatsApp Channel",
    descriptionFr:
      "Diffusion quotidienne des meilleurs codes promos vérifiés (1xBet, Melbet, Betwinner) et coupons du jour.",
    descriptionEn:
      "Daily broadcast of top verified promo codes (1xBet, Melbet, Betwinner) and daily coupons.",
    inviteUrl: "https://whatsapp.com/channel/0029VaBonuvoOfficial",
    subscriberCountLabel: "Notifications silencieuses",
    priorityOrder: 20,
  },
];

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

export async function listPublicCommunityData(countryCode?: string) {
  const normalizedCountry = countryCode?.trim().toUpperCase();
  const allowedCountries =
    normalizedCountry && normalizedCountry !== "GLOBAL" ? ["GLOBAL", normalizedCountry] : undefined;

  return withAppDb({ scope: "public_catalog" }, async (tx) => {
    const channelRows = await tx
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
      .limit(20);

    const couponRows = await tx
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
        validatedAt: coupons.validatedAt,
        publishedToTelegramAt: coupons.publishedToTelegramAt,
      })
      .from(coupons)
      .leftJoin(bookmakers, eq(coupons.bookmakerId, bookmakers.id))
      .where(eq(coupons.status, "validated"))
      .orderBy(desc(coupons.validatedAt), desc(coupons.createdAt))
      .limit(12);

    const postRows = await tx
      .select()
      .from(posts)
      .where(eq(posts.status, "published"))
      .orderBy(desc(posts.featured), desc(posts.publishedAt), desc(posts.createdAt))
      .limit(24);

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
