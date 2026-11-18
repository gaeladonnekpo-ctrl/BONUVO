import "server-only";

import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { withAppDb } from "@/server/db/context";
import { newsletterSubscribers } from "@/server/db/schema";
import {
  newsletterSubscriptionSchema,
  type NewsletterSubscriptionInput,
} from "./newsletter-schema";
import { createUnsubscribeToken } from "./unsubscribe-token";

export { newsletterSubscriptionSchema, type NewsletterSubscriptionInput };

const CURRENT_NEWSLETTER_POLICY_VERSION = "2026-11-v1";

export async function subscribeToNewsletter(rawInput: unknown, ipHash = "") {
  const parsed = newsletterSubscriptionSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      ok: false as const,
      code: "VALIDATION_ERROR" as const,
      message: firstIssue?.message ?? "Données d'inscription invalides.",
    };
  }

  const data = parsed.data;

  return withAppDb({ scope: "public_tracking" }, async (tx) => {
    const [existing] = await tx
      .select({
        id: newsletterSubscribers.id,
        status: newsletterSubscribers.status,
        phone: newsletterSubscribers.phone,
      })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, data.email))
      .limit(1);

    const now = new Date();
    const resolvedPhone = data.phone || existing?.phone || "";

    const [saved] = await tx
      .insert(newsletterSubscribers)
      .values({
        fullName: data.fullName,
        email: data.email,
        phone: resolvedPhone,
        countryCode: data.countryCode,
        locale: data.locale,
        status: "active",
        consentGranted: true,
        consentPolicyVersion: CURRENT_NEWSLETTER_POLICY_VERSION,
        consentRecordedAt: now,
        unsubscribedAt: null,
        source: "home_newsletter",
        ipHash,
      })
      .onConflictDoUpdate({
        target: newsletterSubscribers.email,
        set: {
          fullName: data.fullName,
          phone: resolvedPhone,
          countryCode: data.countryCode,
          locale: data.locale,
          status: "active",
          consentGranted: true,
          consentPolicyVersion: CURRENT_NEWSLETTER_POLICY_VERSION,
          consentRecordedAt: now,
          unsubscribedAt: null,
          ipHash: ipHash || undefined,
          updatedAt: now,
        },
      })
      .returning();

    const subscriber = saved!;
    const unsubscribeToken = createUnsubscribeToken({
      userId: subscriber.id,
      scope: "marketing_email",
    });

    return {
      ok: true as const,
      subscriberId: subscriber.id,
      email: subscriber.email,
      fullName: subscriber.fullName,
      countryCode: subscriber.countryCode,
      alreadySubscribed: Boolean(existing && existing.status === "active"),
      reactivated: Boolean(existing && existing.status === "unsubscribed"),
      unsubscribeToken,
    };
  });
}

export async function unsubscribeNewsletterByEmail(rawEmail: string) {
  const emailSchema = z.string().trim().toLowerCase().email().max(180);
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return { ok: false as const, code: "INVALID_EMAIL" as const };
  }

  return withAppDb({ scope: "public_unsubscribe" }, async (tx) => {
    await tx
      .update(newsletterSubscribers)
      .set({
        status: "unsubscribed",
        consentGranted: false,
        unsubscribedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(newsletterSubscribers.email, parsed.data));

    return { ok: true as const };
  });
}

export async function listAdminNewsletterSubscribers(actorId: string) {
  return withAppDb({ scope: "user_session", actorId }, async (tx) => {
    const subscribers = await tx
      .select()
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.createdAt))
      .limit(200);

    const activeCount = subscribers.filter((s) => s.status === "active").length;
    const unsubscribedCount = subscribers.filter((s) => s.status === "unsubscribed").length;

    return {
      subscribers,
      summary: {
        total: subscribers.length,
        activeCount,
        unsubscribedCount,
      },
    };
  });
}

export async function setAdminNewsletterSubscriberStatus(input: {
  actorId: string;
  subscriberId: string;
  status: "active" | "unsubscribed";
}) {
  return withAppDb({ scope: "user_session", actorId: input.actorId }, async (tx) => {
    const now = new Date();
    const [updated] = await tx
      .update(newsletterSubscribers)
      .set({
        status: input.status,
        consentGranted: input.status === "active",
        unsubscribedAt: input.status === "unsubscribed" ? now : null,
        updatedAt: now,
      })
      .where(eq(newsletterSubscribers.id, input.subscriberId))
      .returning();
    return updated ?? null;
  });
}
