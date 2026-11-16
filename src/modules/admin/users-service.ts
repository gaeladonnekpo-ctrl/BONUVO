import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/server/audit/log";
import {
  assertCanManageTargetRole,
  ForbiddenError,
  hasRole,
  requirePermission,
} from "@/server/auth/permissions";
import { ROLE_NAMES, type RoleName } from "@/server/auth/rbac-catalog";
import type { AuthenticatedUser } from "@/server/auth/session";
import { withAppDb } from "@/server/db/context";
import { profiles, roles, userRoles } from "@/server/db/schema";

const roleMutationSchema = z.object({
  userId: z.string().uuid(),
  roleName: z.enum(ROLE_NAMES),
});

const userStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "suspended"]),
});

export async function listUsersForAdmin(actor: AuthenticatedUser) {
  requirePermission(actor, "users.manage");
  return withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const profileRows = await tx
      .select({
        id: profiles.id,
        email: profiles.email,
        displayName: profiles.displayName,
        countryCode: profiles.countryCode,
        status: profiles.status,
        emailVerifiedAt: profiles.emailVerifiedAt,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .orderBy(desc(profiles.createdAt));

    const roleMappings = await tx
      .select({ userId: userRoles.userId, roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id));

    const rolesByUser = new Map<string, string[]>();
    for (const row of roleMappings) {
      const list = rolesByUser.get(row.userId) ?? [];
      list.push(row.roleName);
      rolesByUser.set(row.userId, list);
    }

    return profileRows.map((p) => ({
      ...p,
      roles: rolesByUser.get(p.id) ?? [],
    }));
  });
}

export async function assignUserRole(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  const parsed = roleMutationSchema.parse(rawInput);

  await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const currentRoles = await tx
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, parsed.userId));
    const currentNames = currentRoles.map((r) => r.roleName);

    assertCanManageTargetRole({
      actor,
      targetRole: parsed.roleName,
      targetCurrentRoles: currentNames,
    });

    const [roleRow] = await tx.select().from(roles).where(eq(roles.name, parsed.roleName));
    if (!roleRow) throw new Error("ROLE_NOT_FOUND");

    await tx
      .insert(userRoles)
      .values({ userId: parsed.userId, roleId: roleRow.id, assignedBy: actor.id })
      .onConflictDoNothing({ target: [userRoles.userId, userRoles.roleId] });
  });

  await logAudit({
    actorId: actor.id,
    action: "user.role_assigned",
    entityType: "user_roles",
    entityId: parsed.userId,
    beforeState: null,
    afterState: { role: parsed.roleName },
    ipHash,
  });
}

export async function revokeUserRole(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  const parsed = roleMutationSchema.parse(rawInput);

  await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const currentRoles = await tx
      .select({ roleName: roles.name, roleId: roles.id })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, parsed.userId));
    const currentNames = currentRoles.map((r) => r.roleName);

    assertCanManageTargetRole({
      actor,
      targetRole: parsed.roleName as RoleName,
      targetCurrentRoles: currentNames,
    });

    if (actor.id === parsed.userId && parsed.roleName === "super_admin") {
      throw new ForbiddenError("Impossible de révoquer votre propre rôle super_admin.");
    }

    const match = currentRoles.find((r) => r.roleName === parsed.roleName);
    if (!match) return;

    await tx
      .delete(userRoles)
      .where(and(eq(userRoles.userId, parsed.userId), eq(userRoles.roleId, match.roleId)));
  });

  await logAudit({
    actorId: actor.id,
    action: "user.role_revoked",
    entityType: "user_roles",
    entityId: parsed.userId,
    beforeState: { role: parsed.roleName },
    afterState: null,
    ipHash,
  });
}

export async function setUserStatus(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "users.manage");
  const parsed = userStatusSchema.parse(rawInput);
  if (actor.id === parsed.userId && parsed.status === "suspended") {
    throw new ForbiddenError("Impossible de suspendre votre propre compte.");
  }

  const result = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const targetRoles = await tx
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, parsed.userId));

    if (targetRoles.some((r) => r.name === "super_admin") && !hasRole(actor, "super_admin")) {
      throw new ForbiddenError("Seul un super_admin peut modifier le statut d'un super_admin.");
    }

    const [existing] = await tx.select().from(profiles).where(eq(profiles.id, parsed.userId));
    if (!existing) throw new Error("USER_NOT_FOUND");

    const [updated] = await tx
      .update(profiles)
      .set({ status: parsed.status })
      .where(eq(profiles.id, parsed.userId))
      .returning();
    if (!updated) throw new Error("USER_UPDATE_FAILED");

    return { beforeState: { status: existing.status }, afterState: { status: updated.status } };
  });

  await logAudit({
    actorId: actor.id,
    action: "user.status_updated",
    entityType: "profiles",
    entityId: parsed.userId,
    beforeState: result.beforeState,
    afterState: result.afterState,
    ipHash,
  });
}
