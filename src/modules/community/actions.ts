"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/server/audit/log";
import { requireActionPermission } from "@/server/auth/guards";
import {
  invalidatePublicCatalogTags,
  PUBLIC_CATALOG_CACHE_TAGS,
} from "@/server/cache/catalog-tags";
import type { CommunityPlatform } from "./channel-url";
import { setAdminNewsletterSubscriberStatus } from "@/modules/members/newsletter-service";
import { createValidatedCoupon, dispatchNotificationBatch } from "./notification-service";
import { createCommunityChannel, createOrUpdatePost } from "./service";

export async function savePostAction(formData: FormData): Promise<void> {
  const actor = await requireActionPermission("content.write");
  const titleFr = String(formData.get("titleFr") ?? "").trim();
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const postTypeRaw = String(formData.get("postType") ?? "news");
  const postType = postTypeRaw === "announcement" ? "announcement" : "news";
  const excerptFr = String(formData.get("excerptFr") ?? "").trim();
  const excerptEn = String(formData.get("excerptEn") ?? "").trim();
  const bodyFr = String(formData.get("bodyFr") ?? "").trim();
  const bodyEn = String(formData.get("bodyEn") ?? "").trim();
  const countryCode = String(formData.get("countryCode") ?? "GLOBAL").trim();
  const featured = formData.get("featured") === "on" || formData.get("featured") === "true";
  const statusRaw = String(formData.get("status") ?? "published");
  const status = statusRaw === "draft" || statusRaw === "archived" ? statusRaw : "published";

  const saved = await createOrUpdatePost({
    actorId: actor.id,
    slug,
    postType,
    titleFr,
    titleEn,
    excerptFr,
    excerptEn,
    bodyFr,
    bodyEn,
    countryCode,
    featured,
    status,
  });

  await logAudit({
    actorId: actor.id,
    action: "community.post.upsert",
    entityType: "posts",
    entityId: saved.id,
    afterState: { slug: saved.slug, status: saved.status, postType: saved.postType },
  });

  invalidatePublicCatalogTags([PUBLIC_CATALOG_CACHE_TAGS.community]);
  revalidatePath("/fr/communaute");
  revalidatePath("/en/communaute");
  revalidatePath(`/fr/actualites/${saved.slug}`);
  revalidatePath(`/en/actualites/${saved.slug}`);
  revalidatePath("/fr/admin/contenus");
  revalidatePath("/en/admin/contenus");
}

export async function saveChannelAction(formData: FormData): Promise<void> {
  const actor = await requireActionPermission("community.manage");
  const platformRaw = String(formData.get("platform") ?? "telegram");
  const platform: CommunityPlatform =
    platformRaw === "whatsapp_channel" ||
    platformRaw === "whatsapp_group" ||
    platformRaw === "facebook"
      ? platformRaw
      : "telegram";

  const saved = await createCommunityChannel({
    actorId: actor.id,
    platform,
    countryCode: String(formData.get("countryCode") ?? "GLOBAL"),
    titleFr: String(formData.get("titleFr") ?? ""),
    titleEn: String(formData.get("titleEn") ?? ""),
    descriptionFr: String(formData.get("descriptionFr") ?? ""),
    descriptionEn: String(formData.get("descriptionEn") ?? ""),
    inviteUrl: String(formData.get("inviteUrl") ?? ""),
    subscriberCountLabel: String(formData.get("subscriberCountLabel") ?? ""),
    priorityOrder: Number(formData.get("priorityOrder") ?? 100) || 100,
    active: formData.get("active") !== "false",
  });

  await logAudit({
    actorId: actor.id,
    action: "community.channel.create",
    entityType: "community_channels",
    entityId: saved.id,
    afterState: { platform: saved.platform, inviteUrl: saved.inviteUrl },
  });

  invalidatePublicCatalogTags([PUBLIC_CATALOG_CACHE_TAGS.community]);
  revalidatePath("/fr/communaute");
  revalidatePath("/en/communaute");
  revalidatePath("/fr/admin/communaute");
  revalidatePath("/en/admin/communaute");
}

export async function saveCouponAction(formData: FormData): Promise<void> {
  const actor = await requireActionPermission("community.manage");
  const statusRaw = String(formData.get("status") ?? "validated");
  const status = statusRaw === "draft" || statusRaw === "archived" ? statusRaw : "validated";

  const saved = await createValidatedCoupon({
    actorId: actor.id,
    titleFr: String(formData.get("titleFr") ?? ""),
    titleEn: String(formData.get("titleEn") ?? ""),
    descriptionFr: String(formData.get("descriptionFr") ?? ""),
    descriptionEn: String(formData.get("descriptionEn") ?? ""),
    countryCode: String(formData.get("countryCode") ?? "GLOBAL"),
    couponCode: String(formData.get("couponCode") ?? ""),
    combinedOdds: String(formData.get("combinedOdds") ?? "").trim() || null,
    confidenceLabel: String(formData.get("confidenceLabel") ?? "medium"),
    status,
    publishToTelegram:
      formData.get("publishToTelegram") === "on" || formData.get("publishToTelegram") === "true",
  });

  await logAudit({
    actorId: actor.id,
    action: "community.coupon.create",
    entityType: "coupons",
    entityId: saved.id,
    afterState: {
      couponCode: saved.couponCode,
      status: saved.status,
      publishedToTelegramAt: saved.publishedToTelegramAt,
    },
  });

  invalidatePublicCatalogTags([PUBLIC_CATALOG_CACHE_TAGS.community]);
  revalidatePath("/fr/communaute");
  revalidatePath("/en/communaute");
  revalidatePath("/fr/admin/communaute");
  revalidatePath("/en/admin/communaute");
}

export async function sendNotificationAction(formData: FormData): Promise<void> {
  const actor = await requireActionPermission("community.manage");
  const channelRaw = String(formData.get("channel") ?? "email");
  const channel = channelRaw === "telegram" ? "telegram" : "email";

  const result = await dispatchNotificationBatch({
    actorId: actor.id,
    titleFr: String(formData.get("titleFr") ?? ""),
    titleEn: String(formData.get("titleEn") ?? ""),
    bodyFr: String(formData.get("bodyFr") ?? ""),
    bodyEn: String(formData.get("bodyEn") ?? ""),
    targetCountryCode: String(formData.get("targetCountryCode") ?? "GLOBAL"),
    channel,
  });

  await logAudit({
    actorId: actor.id,
    action: "community.notification.dispatch",
    entityType: "notifications",
    entityId: result.notification.id,
    afterState: {
      channel,
      sentCount: result.sentCount,
      skippedCount: result.skippedCount,
    },
  });

  revalidatePath("/fr/admin/notifications");
  revalidatePath("/en/admin/notifications");
}

export async function toggleSubscriberStatusAction(formData: FormData): Promise<void> {
  const actor = await requireActionPermission("community.manage");
  const subscriberId = String(formData.get("subscriberId") ?? "").trim();
  const nextStatusRaw = String(formData.get("nextStatus") ?? "unsubscribed");
  const nextStatus = nextStatusRaw === "active" ? "active" : "unsubscribed";

  if (!subscriberId) return;

  const updated = await setAdminNewsletterSubscriberStatus({
    actorId: actor.id,
    subscriberId,
    status: nextStatus,
  });

  if (updated) {
    await logAudit({
      actorId: actor.id,
      action: "newsletter.subscriber.status",
      entityType: "newsletter_subscribers",
      entityId: updated.id,
      afterState: { status: updated.status, consentGranted: updated.consentGranted },
    });
  }

  revalidatePath("/fr/admin/notifications");
  revalidatePath("/en/admin/notifications");
}
