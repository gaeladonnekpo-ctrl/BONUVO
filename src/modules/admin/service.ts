import "server-only";

import { and, count, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/server/audit/log";
import { can, requirePermission } from "@/server/auth/permissions";
import type { AuthenticatedUser } from "@/server/auth/session";
import { withAppDb } from "@/server/db/context";
import {
  affiliateLinks,
  auditLog,
  bookmakers,
  countries,
  offers,
  promoCodes,
  securityEvents,
  settings,
} from "@/server/db/schema";

export {
  assignUserRole,
  listUsersForAdmin,
  revokeUserRole,
  setUserStatus,
} from "@/modules/admin/users-service";

const settingUpdateSchema = z.object({
  key: z.string().trim().min(2).max(120),
  valueJson: z.string().trim().min(2).max(8000),
  description: z.string().trim().max(400).optional(),
});

export async function getAdminDashboardData(actor: AuthenticatedUser) {
  requirePermission(actor, "admin.access");

  return withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const canReadCatalog = can(actor, "offers.read");
    const canReadSettings = can(actor, "settings.read");
    const canReadAudit = can(actor, "audit.read");

    let staleThresholdDays = 30;
    if (canReadSettings) {
      const [freshnessSetting] = await tx
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, "catalog.freshness_warning_days"));
      const rawDays = freshnessSetting?.value?.days;
      if (typeof rawDays === "number" && Number.isFinite(rawDays) && rawDays >= 1) {
        staleThresholdDays = rawDays;
      }
    }

    const cutoff = new Date(Date.now() - staleThresholdDays * 86_400_000);

    const [
      bmActive,
      offersPub,
      offersDraft,
      offersStale,
      codesActive,
      linksActive,
      activeCountries,
      staleOfferRows,
      recentAuditRows,
    ] = await Promise.all([
      canReadCatalog
        ? tx
            .select({ total: count() })
            .from(bookmakers)
            .where(and(eq(bookmakers.status, "active"), isNull(bookmakers.deletedAt)))
        : Promise.resolve([{ total: 0 }]),
      canReadCatalog
        ? tx
            .select({ total: count() })
            .from(offers)
            .where(and(eq(offers.status, "published"), isNull(offers.deletedAt)))
        : Promise.resolve([{ total: 0 }]),
      canReadCatalog
        ? tx
            .select({ total: count() })
            .from(offers)
            .where(and(eq(offers.status, "draft"), isNull(offers.deletedAt)))
        : Promise.resolve([{ total: 0 }]),
      canReadCatalog
        ? tx
            .select({ total: count() })
            .from(offers)
            .where(
              and(
                eq(offers.status, "published"),
                isNull(offers.deletedAt),
                or(isNull(offers.lastVerifiedAt), lt(offers.lastVerifiedAt, cutoff)),
              ),
            )
        : Promise.resolve([{ total: 0 }]),
      canReadCatalog
        ? tx
            .select({ total: count() })
            .from(promoCodes)
            .where(and(eq(promoCodes.status, "active"), isNull(promoCodes.deletedAt)))
        : Promise.resolve([{ total: 0 }]),
      canReadCatalog
        ? tx
            .select({ total: count() })
            .from(affiliateLinks)
            .where(and(eq(affiliateLinks.active, true), isNull(affiliateLinks.deletedAt)))
        : Promise.resolve([{ total: 0 }]),
      canReadCatalog || canReadSettings
        ? tx.select({ total: count() }).from(countries).where(eq(countries.active, true))
        : Promise.resolve([{ total: 0 }]),
      canReadCatalog
        ? tx
            .select({
              id: offers.id,
              titleFr: offers.titleFr,
              lastVerifiedAt: offers.lastVerifiedAt,
              bookmakerName: bookmakers.name,
            })
            .from(offers)
            .innerJoin(bookmakers, eq(offers.bookmakerId, bookmakers.id))
            .where(
              and(
                eq(offers.status, "published"),
                isNull(offers.deletedAt),
                or(isNull(offers.lastVerifiedAt), lt(offers.lastVerifiedAt, cutoff)),
              ),
            )
            .limit(8)
        : Promise.resolve([]),
      canReadAudit
        ? tx.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(8)
        : Promise.resolve([]),
    ]);

    return {
      staleThresholdDays,
      counts: {
        bookmakersActive: bmActive[0]?.total ?? 0,
        offersPublished: offersPub[0]?.total ?? 0,
        offersDraft: offersDraft[0]?.total ?? 0,
        offersStaleVerification: offersStale[0]?.total ?? 0,
        promoCodesActive: codesActive[0]?.total ?? 0,
        affiliateLinksActive: linksActive[0]?.total ?? 0,
        countriesActive: activeCountries[0]?.total ?? 0,
      },
      staleOffers: staleOfferRows,
      recentAudit: recentAuditRows,
    };
  });
}

export async function listAuditAndSecurityForAdmin(actor: AuthenticatedUser, limit = 50) {
  requirePermission(actor, "audit.read");
  return withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [audits, secEvents] = await Promise.all([
      tx.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit),
      tx.select().from(securityEvents).orderBy(desc(securityEvents.createdAt)).limit(limit),
    ]);
    return { audits, secEvents };
  });
}

export async function listEntityAuditTimeline(
  actor: AuthenticatedUser,
  entityTypes: readonly string[],
  entityId: string,
) {
  if (!can(actor, "audit.read")) return [];
  return withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) =>
    tx
      .select()
      .from(auditLog)
      .where(and(inArray(auditLog.entityType, [...entityTypes]), eq(auditLog.entityId, entityId)))
      .orderBy(desc(auditLog.createdAt))
      .limit(20),
  );
}

export async function listSettingsForAdmin(actor: AuthenticatedUser) {
  requirePermission(actor, "settings.read");
  return withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) =>
    tx.select().from(settings).orderBy(settings.key),
  );
}

export async function updateSettingForAdmin(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "settings.manage");
  const parsed = settingUpdateSchema.parse(rawInput);

  let parsedJson: Record<string, unknown>;
  try {
    const candidate = JSON.parse(parsed.valueJson);
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new Error("NOT_OBJECT");
    }
    parsedJson = candidate as Record<string, unknown>;
  } catch {
    throw new Error("INVALID_SETTING_JSON");
  }

  const result = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [existing] = await tx.select().from(settings).where(eq(settings.key, parsed.key));
    const [saved] = await tx
      .insert(settings)
      .values({
        key: parsed.key,
        value: parsedJson,
        description: parsed.description ?? existing?.description ?? "",
        updatedBy: actor.id,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: parsedJson,
          description: parsed.description ?? existing?.description ?? "",
          updatedBy: actor.id,
        },
      })
      .returning();
    if (!saved) throw new Error("SETTING_SAVE_FAILED");

    return { beforeState: existing?.value ?? null, afterState: saved.value };
  });

  await logAudit({
    actorId: actor.id,
    action: "setting.updated",
    entityType: "settings",
    entityId: parsed.key,
    beforeState: result.beforeState,
    afterState: result.afterState,
    ipHash,
  });
}
