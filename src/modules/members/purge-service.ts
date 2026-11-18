import "server-only";

import { and, desc, eq, lte } from "drizzle-orm";
import { ForbiddenError } from "@/server/auth/permissions";
import { withAppDb } from "@/server/db/context";
import {
  accountDeletionRequests,
  communicationPreferences,
  consents,
  memberActivity,
  newsletterSubscribers,
  profiles,
} from "@/server/db/schema";
import { verifyUnsubscribeToken } from "./unsubscribe-token";

const CURRENT_POLICY_VERSION = "2026-11-v1";

/**
 * Traite une désinscription en 1 clic sans besoin de connexion grâce au jeton signé HMAC
 * (fonctionne aussi bien pour un membre inscrit que pour un abonné Newsletter CRM).
 */
export async function processSignedUnsubscribe(input: { token: string; ipHash?: string }) {
  const verified = verifyUnsubscribeToken(input.token);
  if (!verified.valid) {
    return { ok: false as const, reason: verified.reason };
  }

  const { userId, scope } = verified.payload;

  return withAppDb({ scope: "public_unsubscribe" }, async (tx) => {
    const [profile] = await tx.select().from(profiles).where(eq(profiles.id, userId)).limit(1);

    if (!profile) {
      const [subscriber] = await tx
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.id, userId))
        .limit(1);

      if (!subscriber) {
        return { ok: false as const, reason: "USER_NOT_FOUND" };
      }

      const now = new Date();
      await tx
        .update(newsletterSubscribers)
        .set({
          status: "unsubscribed",
          consentGranted: false,
          unsubscribedAt: now,
          updatedAt: now,
        })
        .where(eq(newsletterSubscribers.id, subscriber.id));

      return {
        ok: true as const,
        userId: subscriber.id,
        scope,
      };
    }

    await tx
      .update(newsletterSubscribers)
      .set({
        status: "unsubscribed",
        consentGranted: false,
        unsubscribedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(newsletterSubscribers.email, profile.email.toLowerCase()));

    const consentTypesToWithdraw: Array<"marketing_email" | "notifications"> =
      scope === "marketing_email"
        ? ["marketing_email"]
        : scope === "notifications"
          ? ["notifications"]
          : ["marketing_email", "notifications"];

    for (const cType of consentTypesToWithdraw) {
      await tx.insert(consents).values({
        userId,
        consentType: cType,
        granted: false,
        policyVersion: CURRENT_POLICY_VERSION,
        ipHash: input.ipHash || "00000000",
      });
    }

    await tx
      .insert(communicationPreferences)
      .values({
        userId,
        emailAnnouncements: false,
        emailPromos: false,
        emailPredictions: false,
        preferredChannel: "none",
        unsubscribeTokenHash: "",
      })
      .onConflictDoUpdate({
        target: communicationPreferences.userId,
        set: {
          emailAnnouncements: false,
          emailPromos: false,
          emailPredictions: false,
          preferredChannel: "none",
          updatedAt: new Date(),
        },
      });

    await tx.insert(memberActivity).values({
      userId,
      activityType: "unsubscribed",
      metadataJson: { scope, via: "signed_token_1click" },
      ipHash: input.ipHash ?? "",
    });

    return {
      ok: true as const,
      userId,
      scope,
    };
  });
}

/**
 * Exporte en JSON toutes les données personnelles d'un membre authentifié.
 */
export async function exportMemberPersonalData(input: {
  actorId: string;
  targetUserId: string;
  ipHash?: string;
}) {
  if (!input.actorId || input.actorId !== input.targetUserId) {
    throw new ForbiddenError("Export personnel limité au titulaire du compte.");
  }

  return withAppDb({ scope: "user_session", actorId: input.actorId }, async (tx) => {
    const [profile] = await tx
      .select()
      .from(profiles)
      .where(eq(profiles.id, input.targetUserId))
      .limit(1);

    const [prefs] = await tx
      .select()
      .from(communicationPreferences)
      .where(eq(communicationPreferences.userId, input.targetUserId))
      .limit(1);

    const consentRows = await tx
      .select()
      .from(consents)
      .where(eq(consents.userId, input.targetUserId))
      .orderBy(desc(consents.recordedAt));

    const activityRows = await tx
      .select()
      .from(memberActivity)
      .where(eq(memberActivity.userId, input.targetUserId))
      .orderBy(desc(memberActivity.createdAt));

    const deletionRows = await tx
      .select()
      .from(accountDeletionRequests)
      .where(eq(accountDeletionRequests.userId, input.targetUserId))
      .orderBy(desc(accountDeletionRequests.requestedAt));

    await tx.insert(memberActivity).values({
      userId: input.targetUserId,
      activityType: "data_exported",
      metadataJson: { format: "json" },
      ipHash: input.ipHash ?? "",
    });

    return {
      exportedAt: new Date().toISOString(),
      platform: "BONUVO",
      userId: input.targetUserId,
      profile: profile ?? null,
      communicationPreferences: prefs
        ? {
            emailAnnouncements: prefs.emailAnnouncements,
            emailPromos: prefs.emailPromos,
            emailPredictions: prefs.emailPredictions,
            preferredChannel: prefs.preferredChannel,
            updatedAt: prefs.updatedAt,
          }
        : null,
      consents: consentRows,
      memberActivity: activityRows,
      accountDeletionRequests: deletionRows,
    };
  });
}

/**
 * Exécute la purge RGPD des demandes de suppression de compte arrivées à échéance (14 jours).
 * Anonymise les données personnelles tout en conservant les statistiques anonymes.
 */
export async function runPurgeDataJob(now: Date = new Date()): Promise<{
  processedCount: number;
  anonymizedUserIds: string[];
}> {
  return withAppDb({ scope: "purge_worker" }, async (tx) => {
    const dueRequests = await tx
      .select()
      .from(accountDeletionRequests)
      .where(
        and(
          eq(accountDeletionRequests.status, "pending"),
          lte(accountDeletionRequests.scheduledPurgeAt, now),
        ),
      )
      .limit(100);

    const anonymizedUserIds: string[] = [];

    for (const req of dueRequests) {
      const anonymizedEmail = `deleted-${req.userId}@anonymized.bonuvo.local`;

      await tx
        .update(profiles)
        .set({
          email: anonymizedEmail,
          displayName: "Compte supprimé",
          countryCode: "GLOBAL",
          locale: "fr",
          status: "suspended",
          deletedAt: now,
          updatedAt: now,
        })
        .where(eq(profiles.id, req.userId));

      await tx
        .delete(communicationPreferences)
        .where(eq(communicationPreferences.userId, req.userId));

      await tx.delete(memberActivity).where(eq(memberActivity.userId, req.userId));

      await tx
        .update(accountDeletionRequests)
        .set({
          status: "executed",
          executedAt: now,
          reason: "",
          updatedAt: now,
        })
        .where(eq(accountDeletionRequests.id, req.id));

      anonymizedUserIds.push(req.userId);
    }

    return {
      processedCount: anonymizedUserIds.length,
      anonymizedUserIds,
    };
  });
}
