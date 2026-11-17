import "server-only";

import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { ForbiddenError } from "@/server/auth/permissions";
import { withAppDb } from "@/server/db/context";
import {
  accountDeletionRequests,
  communicationPreferences,
  consents,
  memberActivity,
  profiles,
  type ConsentType,
} from "@/server/db/schema";
import { computeScheduledPurgeDate, createUnsubscribeToken } from "./unsubscribe-token";

const CURRENT_POLICY_VERSION = "2026-11-v1";

function assertOwnership(actorId: string, targetUserId: string): void {
  if (!actorId || !targetUserId || actorId !== targetUserId) {
    throw new ForbiddenError(
      "Accès refusé : chaque action membre est strictement limitée au propriétaire du compte.",
    );
  }
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function getMemberDashboardData(userId: string) {
  return withAppDb({ scope: "user_session", actorId: userId }, async (tx) => {
    const [profile] = await tx.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    let [prefs] = await tx
      .select()
      .from(communicationPreferences)
      .where(eq(communicationPreferences.userId, userId))
      .limit(1);

    const unsubscribeToken = createUnsubscribeToken({ userId, scope: "all" });

    if (!prefs) {
      const [inserted] = await tx
        .insert(communicationPreferences)
        .values({
          userId,
          emailAnnouncements: false,
          emailPromos: false,
          emailPredictions: false,
          preferredChannel: "email",
          unsubscribeTokenHash: hashToken(unsubscribeToken),
        })
        .returning();
      prefs = inserted!;
    }

    const consentHistory = await tx
      .select()
      .from(consents)
      .where(eq(consents.userId, userId))
      .orderBy(desc(consents.recordedAt), desc(consents.id))
      .limit(20);

    const activities = await tx
      .select()
      .from(memberActivity)
      .where(eq(memberActivity.userId, userId))
      .orderBy(desc(memberActivity.createdAt))
      .limit(20);

    const [pendingDeletion] = await tx
      .select()
      .from(accountDeletionRequests)
      .where(
        and(
          eq(accountDeletionRequests.userId, userId),
          eq(accountDeletionRequests.status, "pending"),
        ),
      )
      .orderBy(desc(accountDeletionRequests.requestedAt))
      .limit(1);

    return {
      profile: profile ?? null,
      preferences: prefs,
      consentHistory,
      activities,
      pendingDeletion: pendingDeletion ?? null,
      unsubscribeToken,
    };
  });
}

export async function updateMemberProfile(input: {
  actorId: string;
  targetUserId: string;
  displayName?: string | null;
  countryCode?: string | null;
  preferredLocale: "fr" | "en";
  ipHash?: string;
}) {
  assertOwnership(input.actorId, input.targetUserId);

  return withAppDb({ scope: "user_session", actorId: input.actorId }, async (tx) => {
    const cleanName = input.displayName?.trim().slice(0, 64) || "Membre BONUVO";
    const cleanCountry = input.countryCode?.trim().toUpperCase().slice(0, 2) || "GLOBAL";

    const [updated] = await tx
      .update(profiles)
      .set({
        displayName: cleanName,
        countryCode: cleanCountry,
        locale: input.preferredLocale,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, input.targetUserId))
      .returning();

    await tx.insert(memberActivity).values({
      userId: input.targetUserId,
      activityType: "profile_updated",
      metadataJson: { preferredLocale: input.preferredLocale, countryCode: cleanCountry },
      ipHash: input.ipHash || "00000000",
    });

    return updated!;
  });
}

export async function recordMemberConsentAndPreferences(input: {
  actorId: string;
  targetUserId: string;
  consentType: ConsentType;
  granted: boolean;
  emailAnnouncements: boolean;
  emailPromos: boolean;
  emailPredictions: boolean;
  preferredChannel: "email" | "telegram" | "whatsapp" | "none";
  policyVersion?: string;
  ipHash?: string;
}) {
  assertOwnership(input.actorId, input.targetUserId);
  const policyVersion = input.policyVersion || CURRENT_POLICY_VERSION;
  const safeIpHash = input.ipHash || "00000000";

  return withAppDb({ scope: "user_session", actorId: input.actorId }, async (tx) => {
    const [consentRow] = await tx
      .insert(consents)
      .values({
        userId: input.targetUserId,
        consentType: input.consentType,
        granted: input.granted,
        policyVersion,
        ipHash: safeIpHash,
      })
      .returning();

    const token = createUnsubscribeToken({ userId: input.targetUserId, scope: "all" });

    const [prefsRow] = await tx
      .insert(communicationPreferences)
      .values({
        userId: input.targetUserId,
        emailAnnouncements: input.granted ? input.emailAnnouncements : false,
        emailPromos: input.granted ? input.emailPromos : false,
        emailPredictions: input.granted ? input.emailPredictions : false,
        preferredChannel: input.granted ? input.preferredChannel : "none",
        unsubscribeTokenHash: hashToken(token),
      })
      .onConflictDoUpdate({
        target: communicationPreferences.userId,
        set: {
          emailAnnouncements: input.granted ? input.emailAnnouncements : false,
          emailPromos: input.granted ? input.emailPromos : false,
          emailPredictions: input.granted ? input.emailPredictions : false,
          preferredChannel: input.granted ? input.preferredChannel : "none",
          updatedAt: new Date(),
        },
      })
      .returning();

    await tx.insert(memberActivity).values({
      userId: input.targetUserId,
      activityType: "consent_recorded",
      metadataJson: {
        consentType: input.consentType,
        granted: input.granted,
        policyVersion,
        preferredChannel: prefsRow!.preferredChannel,
      },
      ipHash: safeIpHash,
    });

    return { consent: consentRow!, preferences: prefsRow! };
  });
}

export async function requestAccountDeletion(input: {
  actorId: string;
  targetUserId: string;
  reason?: string;
  ipHash?: string;
}) {
  assertOwnership(input.actorId, input.targetUserId);
  const now = new Date();
  const scheduledPurgeAt = computeScheduledPurgeDate(now);

  return withAppDb({ scope: "user_session", actorId: input.actorId }, async (tx) => {
    const existing = await tx
      .select()
      .from(accountDeletionRequests)
      .where(
        and(
          eq(accountDeletionRequests.userId, input.targetUserId),
          eq(accountDeletionRequests.status, "pending"),
        ),
      )
      .limit(1);

    if (existing[0]) return existing[0];

    const [requestRow] = await tx
      .insert(accountDeletionRequests)
      .values({
        userId: input.targetUserId,
        status: "pending",
        reason: (input.reason ?? "").trim().slice(0, 280),
        requestedAt: now,
        scheduledPurgeAt,
      })
      .returning();

    await tx
      .update(profiles)
      .set({ status: "pending_deletion", updatedAt: now })
      .where(eq(profiles.id, input.targetUserId));

    await tx.insert(memberActivity).values({
      userId: input.targetUserId,
      activityType: "deletion_requested",
      metadataJson: { scheduledPurgeAt: scheduledPurgeAt.toISOString() },
      ipHash: input.ipHash || "00000000",
    });

    return requestRow!;
  });
}

export async function cancelAccountDeletion(input: {
  actorId: string;
  targetUserId: string;
  ipHash?: string;
}) {
  assertOwnership(input.actorId, input.targetUserId);
  const now = new Date();

  return withAppDb({ scope: "user_session", actorId: input.actorId }, async (tx) => {
    const [cancelled] = await tx
      .update(accountDeletionRequests)
      .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
      .where(
        and(
          eq(accountDeletionRequests.userId, input.targetUserId),
          eq(accountDeletionRequests.status, "pending"),
        ),
      )
      .returning();

    await tx
      .update(profiles)
      .set({ status: "active", updatedAt: now })
      .where(eq(profiles.id, input.targetUserId));

    await tx.insert(memberActivity).values({
      userId: input.targetUserId,
      activityType: "deletion_cancelled",
      metadataJson: { cancelledAt: now.toISOString() },
      ipHash: input.ipHash || "00000000",
    });

    return cancelled ?? null;
  });
}
