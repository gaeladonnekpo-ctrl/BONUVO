import "server-only";

import { and, eq } from "drizzle-orm";
import { logAudit } from "@/server/audit/log";
import { assertCanManageTargetRole, type AuthActorSnapshot } from "@/server/auth/permissions";
import type { RoleName } from "@/server/auth/rbac-catalog";
import { withAppDb } from "@/server/db/context";
import { consents, profiles, roles, userRoles, type ConsentType } from "@/server/db/schema";

export async function findProfileForSecurityByEmail(email: string): Promise<{
  id: string;
  email: string;
  locale: string;
} | null> {
  return withAppDb({ scope: "auth_bootstrap" }, async (tx) => {
    const [row] = await tx
      .select({ id: profiles.id, email: profiles.email, locale: profiles.locale })
      .from(profiles)
      .where(eq(profiles.email, email.toLowerCase()));
    return row ?? null;
  });
}

export async function recordConsentDecisions(input: {
  userId: string;
  ipHash: string;
  policyVersion: string;
  decisions: Array<{ type: ConsentType; granted: boolean }>;
}): Promise<void> {
  if (input.decisions.length === 0) return;
  await withAppDb({ scope: "auth_bootstrap", actorId: input.userId }, async (tx) => {
    await tx.insert(consents).values(
      input.decisions.map((item) => ({
        userId: input.userId,
        consentType: item.type,
        granted: item.granted,
        policyVersion: input.policyVersion,
        ipHash: input.ipHash,
      })),
    );
  });
}

export async function assignRoleToUser(input: {
  actor: AuthActorSnapshot;
  targetUserId: string;
  targetRole: RoleName;
  ipHash?: string | null;
}): Promise<void> {
  const targetRoles = await withAppDb(
    { scope: "user_session", actorId: input.actor.id },
    async (tx) => {
      const currentRows = await tx
        .select({ name: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(eq(userRoles.userId, input.targetUserId));
      return currentRows.map((r) => r.name);
    },
  );

  assertCanManageTargetRole({
    actor: input.actor,
    targetRole: input.targetRole,
    targetCurrentRoles: targetRoles,
  });

  await withAppDb({ scope: "user_session", actorId: input.actor.id }, async (tx) => {
    const [roleRow] = await tx.select().from(roles).where(eq(roles.name, input.targetRole));
    if (!roleRow) {
      throw new Error(`Rôle introuvable : ${input.targetRole}`);
    }

    await tx
      .insert(userRoles)
      .values({
        userId: input.targetUserId,
        roleId: roleRow.id,
        assignedBy: input.actor.id,
      })
      .onConflictDoNothing({ target: [userRoles.userId, userRoles.roleId] });
  });

  await logAudit({
    actorId: input.actor.id,
    action: "user_role.assigned",
    entityType: "user_roles",
    entityId: input.targetUserId,
    beforeState: { roles: targetRoles },
    afterState: { addedRole: input.targetRole },
    ipHash: input.ipHash ?? null,
  });
}

export async function revokeRoleFromUser(input: {
  actor: AuthActorSnapshot;
  targetUserId: string;
  targetRole: RoleName;
  ipHash?: string | null;
}): Promise<void> {
  const targetRoles = await withAppDb(
    { scope: "user_session", actorId: input.actor.id },
    async (tx) => {
      const currentRows = await tx
        .select({ name: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(eq(userRoles.userId, input.targetUserId));
      return currentRows.map((r) => r.name);
    },
  );

  assertCanManageTargetRole({
    actor: input.actor,
    targetRole: input.targetRole,
    targetCurrentRoles: targetRoles,
  });

  await withAppDb({ scope: "user_session", actorId: input.actor.id }, async (tx) => {
    const [roleRow] = await tx.select().from(roles).where(eq(roles.name, input.targetRole));
    if (!roleRow) return;

    await tx
      .delete(userRoles)
      .where(and(eq(userRoles.userId, input.targetUserId), eq(userRoles.roleId, roleRow.id)));
  });

  await logAudit({
    actorId: input.actor.id,
    action: "user_role.revoked",
    entityType: "user_roles",
    entityId: input.targetUserId,
    beforeState: { roles: targetRoles },
    afterState: { removedRole: input.targetRole },
    ipHash: input.ipHash ?? null,
  });
}
