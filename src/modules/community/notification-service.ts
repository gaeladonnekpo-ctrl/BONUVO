import "server-only";

import { and, desc, eq, gte } from "drizzle-orm";
import { withAppDb } from "@/server/db/context";
import {
  communicationPreferences,
  consents,
  coupons,
  notificationDeliveries,
  notifications,
  profiles,
} from "@/server/db/schema";
import { getServerEnv } from "@/server/env";
import { sanitizeEditorialContent } from "./sanitizer";

const DAILY_FREE_EMAIL_QUOTA = 90;

export async function createValidatedCoupon(input: {
  actorId: string;
  titleFr: string;
  titleEn?: string;
  descriptionFr?: string;
  descriptionEn?: string;
  countryCode?: string;
  couponCode: string;
  combinedOdds?: string | null;
  confidenceLabel?: string;
  status: "draft" | "validated" | "archived";
  publishToTelegram?: boolean;
}) {
  const safeTitleFr = sanitizeEditorialContent(input.titleFr);
  if (!safeTitleFr) {
    throw new Error("EMPTY_COUPON_TITLE");
  }

  let publishedToTelegramAt: Date | null = null;
  if (input.status === "validated" && input.publishToTelegram) {
    const sent = await publishMessageToTelegram(
      `🎯 *BONUVO COUPON VALIDÉ*\n${safeTitleFr}\nCode : \`${sanitizeEditorialContent(input.couponCode)}\`${input.combinedOdds ? `\nCote combinée : ${input.combinedOdds}` : ""}`,
    );
    if (sent) {
      publishedToTelegramAt = new Date();
    }
  }

  return withAppDb({ scope: "user_session", actorId: input.actorId }, async (tx) => {
    const [row] = await tx
      .insert(coupons)
      .values({
        titleFr: safeTitleFr,
        titleEn: sanitizeEditorialContent(input.titleEn || safeTitleFr),
        descriptionFr: sanitizeEditorialContent(input.descriptionFr ?? ""),
        descriptionEn: sanitizeEditorialContent(input.descriptionEn || input.descriptionFr || ""),
        countryCode: (input.countryCode || "GLOBAL").toUpperCase(),
        couponCode: sanitizeEditorialContent(input.couponCode),
        combinedOdds: input.combinedOdds || null,
        confidenceLabel: input.confidenceLabel || "medium",
        status: input.status,
        validatedBy: input.status === "validated" ? input.actorId : null,
        validatedAt: input.status === "validated" ? new Date() : null,
        publishedToTelegramAt,
      })
      .returning();
    return row!;
  });
}

export async function publishMessageToTelegram(text: string): Promise<boolean> {
  const env = getServerEnv();
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_DEFAULT_CHAT_ID) {
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_DEFAULT_CHAT_ID,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function listAdminNotifications(actorId: string) {
  return withAppDb({ scope: "user_session", actorId }, async (tx) => {
    const [items, deliveries] = await Promise.all([
      tx.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(40),
      tx
        .select()
        .from(notificationDeliveries)
        .orderBy(desc(notificationDeliveries.createdAt))
        .limit(80),
    ]);
    return { notifications: items, deliveries };
  });
}

/**
 * Envoie une notification en vérifiant systématiquement :
 * 1) le dernier consentement daté append-only dans `public.consents`
 * 2) les préférences courantes dans `public.communication_preferences`
 * 3) le quota journalier gratuit d'e-mails (90/24h).
 */
export async function dispatchNotificationBatch(input: {
  actorId: string;
  titleFr: string;
  titleEn?: string;
  bodyFr: string;
  bodyEn?: string;
  targetCountryCode?: string;
  channel: "email" | "telegram";
}) {
  const safeTitleFr = sanitizeEditorialContent(input.titleFr);
  const safeBodyFr = sanitizeEditorialContent(input.bodyFr);
  if (!safeTitleFr || !safeBodyFr) {
    throw new Error("EMPTY_NOTIFICATION_CONTENT");
  }

  return withAppDb({ scope: "user_session", actorId: input.actorId }, async (tx) => {
    const [notif] = await tx
      .insert(notifications)
      .values({
        titleFr: safeTitleFr,
        titleEn: sanitizeEditorialContent(input.titleEn || safeTitleFr),
        bodyFr: safeBodyFr,
        bodyEn: sanitizeEditorialContent(input.bodyEn || safeBodyFr),
        targetCountryCode: (input.targetCountryCode || "GLOBAL").toUpperCase(),
        channel: input.channel,
        status: "queued",
        createdBy: input.actorId,
      })
      .returning();

    if (input.channel === "telegram") {
      const sent = await publishMessageToTelegram(`📣 *${safeTitleFr}*\n\n${safeBodyFr}`);
      await tx.insert(notificationDeliveries).values({
        notificationId: notif!.id,
        userId: null,
        channel: "telegram",
        status: sent ? "sent" : "failed",
        errorText: sent ? "" : "TELEGRAM_BOT_NOT_CONFIGURED_OR_FAILED",
        deliveredAt: sent ? new Date() : null,
      });

      const [updated] = await tx
        .update(notifications)
        .set({
          status: sent ? "sent" : "failed",
          sentCount: sent ? 1 : 0,
          sentAt: sent ? new Date() : null,
        })
        .where(eq(notifications.id, notif!.id))
        .returning();

      return { notification: updated!, sentCount: sent ? 1 : 0, skippedCount: 0 };
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSent = await tx
      .select({ id: notificationDeliveries.id })
      .from(notificationDeliveries)
      .where(
        and(
          eq(notificationDeliveries.channel, "email"),
          eq(notificationDeliveries.status, "sent"),
          gte(notificationDeliveries.createdAt, since24h),
        ),
      );

    let remainingQuota = Math.max(0, DAILY_FREE_EMAIL_QUOTA - recentSent.length);

    const activeProfiles = await tx
      .select()
      .from(profiles)
      .where(eq(profiles.status, "active"))
      .limit(200);

    const allPrefs = await tx.select().from(communicationPreferences);
    const prefsByUser = new Map(allPrefs.map((p) => [p.userId, p]));

    const allConsents = await tx
      .select()
      .from(consents)
      .orderBy(desc(consents.recordedAt), desc(consents.id));

    const latestConsentByUser = new Map<string, boolean>();
    for (const c of allConsents) {
      if (
        (c.consentType === "notifications" || c.consentType === "marketing_email") &&
        !latestConsentByUser.has(c.userId)
      ) {
        latestConsentByUser.set(c.userId, c.granted);
      }
    }

    let sentCount = 0;
    let skippedCount = 0;

    for (const member of activeProfiles) {
      if (
        input.targetCountryCode &&
        input.targetCountryCode.toUpperCase() !== "GLOBAL" &&
        member.countryCode?.toUpperCase() !== input.targetCountryCode.toUpperCase()
      ) {
        continue;
      }

      const pref = prefsByUser.get(member.id);
      const consentGranted = latestConsentByUser.get(member.id) === true;
      const prefAllowed = pref
        ? (pref.emailAnnouncements || pref.emailPromos || pref.emailPredictions) &&
          pref.preferredChannel !== "none"
        : consentGranted;

      if (!consentGranted || !prefAllowed) {
        skippedCount += 1;
        await tx.insert(notificationDeliveries).values({
          notificationId: notif!.id,
          userId: member.id,
          channel: "email",
          status: "skipped_no_consent",
          errorText: "CONSENT_WITHDRAWN_OR_NOT_GRANTED",
        });
        continue;
      }

      if (remainingQuota <= 0) {
        skippedCount += 1;
        await tx.insert(notificationDeliveries).values({
          notificationId: notif!.id,
          userId: member.id,
          channel: "email",
          status: "failed",
          errorText: "DAILY_QUOTA_REACHED",
        });
        continue;
      }

      remainingQuota -= 1;
      sentCount += 1;
      await tx.insert(notificationDeliveries).values({
        notificationId: notif!.id,
        userId: member.id,
        channel: "email",
        status: "sent",
        deliveredAt: new Date(),
      });
    }

    const [updated] = await tx
      .update(notifications)
      .set({
        status: "sent",
        sentCount,
        sentAt: new Date(),
      })
      .where(eq(notifications.id, notif!.id))
      .returning();

    return { notification: updated!, sentCount, skippedCount };
  });
}
