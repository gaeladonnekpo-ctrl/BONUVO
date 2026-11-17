"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { logAudit } from "@/server/audit/log";
import { requireActionUser } from "@/server/auth/guards";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";
import {
  cancelAccountDeletion,
  recordMemberConsentAndPreferences,
  requestAccountDeletion,
  updateMemberProfile,
} from "./service";

async function resolveCurrentIpHash(): Promise<string> {
  try {
    const reqHeaders = await headers();
    const env = getServerEnv();
    return hashIp(extractTrustedClientIp(reqHeaders, env.APP_ENV)) ?? "00000000";
  } catch {
    return "00000000";
  }
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  const actor = await requireActionUser();
  const targetUserId = String(formData.get("userId") ?? actor.id);
  const displayName = String(formData.get("displayName") ?? "").trim();
  const countryCode = String(formData.get("countryCode") ?? "").trim();
  const localeRaw = String(formData.get("preferredLocale") ?? "fr");
  const preferredLocale = localeRaw === "en" ? "en" : "fr";
  const ipHash = await resolveCurrentIpHash();

  await updateMemberProfile({
    actorId: actor.id,
    targetUserId,
    displayName,
    countryCode,
    preferredLocale,
    ipHash,
  });

  await logAudit({
    actorId: actor.id,
    action: "member.profile.update",
    entityType: "profiles",
    entityId: actor.id,
    ipHash,
    afterState: { preferredLocale, countryCode },
  });

  revalidatePath("/fr/compte");
  revalidatePath("/en/compte");
}

export async function updateConsentPreferencesAction(formData: FormData): Promise<void> {
  const actor = await requireActionUser();
  const targetUserId = String(formData.get("userId") ?? actor.id);
  const consentTypeRaw = String(formData.get("consentType") ?? "marketing_email");
  const consentType =
    consentTypeRaw === "notifications" || consentTypeRaw === "analytics"
      ? consentTypeRaw
      : "marketing_email";

  const granted = formData.get("granted") === "on" || formData.get("granted") === "true";
  const emailAnnouncements =
    formData.get("emailAnnouncements") === "on" || formData.get("emailAnnouncements") === "true";
  const emailPromos =
    formData.get("emailPromos") === "on" || formData.get("emailPromos") === "true";
  const emailPredictions =
    formData.get("emailPredictions") === "on" || formData.get("emailPredictions") === "true";
  const channelRaw = String(formData.get("preferredChannel") ?? "email");
  const preferredChannel =
    channelRaw === "telegram" || channelRaw === "whatsapp" || channelRaw === "none"
      ? channelRaw
      : "email";
  const ipHash = await resolveCurrentIpHash();

  const res = await recordMemberConsentAndPreferences({
    actorId: actor.id,
    targetUserId,
    consentType,
    granted,
    emailAnnouncements,
    emailPromos,
    emailPredictions,
    preferredChannel,
    ipHash,
  });

  await logAudit({
    actorId: actor.id,
    action: "member.consent.record",
    entityType: "consents",
    entityId: String(res.consent.id),
    ipHash,
    afterState: {
      consentType,
      granted,
      preferredChannel: res.preferences.preferredChannel,
    },
  });

  revalidatePath("/fr/compte");
  revalidatePath("/en/compte");
}

export async function requestDeletionAction(formData: FormData): Promise<void> {
  const actor = await requireActionUser();
  const targetUserId = String(formData.get("userId") ?? actor.id);
  const reason = String(formData.get("reason") ?? "").trim();
  const ipHash = await resolveCurrentIpHash();

  const reqRow = await requestAccountDeletion({
    actorId: actor.id,
    targetUserId,
    reason,
    ipHash,
  });

  await logAudit({
    actorId: actor.id,
    action: "member.deletion.request",
    entityType: "account_deletion_requests",
    entityId: reqRow.id,
    ipHash,
    afterState: {
      status: reqRow.status,
      scheduledPurgeAt: reqRow.scheduledPurgeAt.toISOString(),
    },
  });

  revalidatePath("/fr/compte");
  revalidatePath("/en/compte");
}

export async function cancelDeletionAction(formData: FormData): Promise<void> {
  const actor = await requireActionUser();
  const targetUserId = String(formData.get("userId") ?? actor.id);
  const ipHash = await resolveCurrentIpHash();

  const cancelled = await cancelAccountDeletion({
    actorId: actor.id,
    targetUserId,
    ipHash,
  });

  if (cancelled) {
    await logAudit({
      actorId: actor.id,
      action: "member.deletion.cancel",
      entityType: "account_deletion_requests",
      entityId: cancelled.id,
      ipHash,
      afterState: { status: "cancelled" },
    });
  }

  revalidatePath("/fr/compte");
  revalidatePath("/en/compte");
}
