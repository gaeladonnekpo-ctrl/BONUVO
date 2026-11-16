import "server-only";

import { eq } from "drizzle-orm";
import { withAppDb } from "@/server/db/context";
import {
  permissions,
  profiles,
  rolePermissions,
  roles,
  userRoles,
  type ProfileStatus,
} from "@/server/db/schema";
import { roleRequiresTotp, type PermissionKey, type RoleName } from "@/server/auth/rbac-catalog";
import { createSupabaseServerClient } from "@/server/auth/supabase";

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  countryCode: string;
  locale: string;
  timezone: string;
  emailVerified: boolean;
  status: ProfileStatus;
  roles: RoleName[];
  permissions: PermissionKey[];
  requiresTotp: boolean;
  aal: "aal1" | "aal2";
}

export async function loadOrBootstrapProfileContext(input: {
  userId: string;
  email: string;
  displayName?: string | null;
  emailVerifiedAt?: Date | null;
}): Promise<{
  displayName: string;
  countryCode: string;
  locale: string;
  timezone: string;
  emailVerified: boolean;
  status: ProfileStatus;
  roles: RoleName[];
  permissions: PermissionKey[];
}> {
  return withAppDb({ scope: "auth_bootstrap", actorId: input.userId }, async (tx) => {
    const [existingProfile] = await tx.select().from(profiles).where(eq(profiles.id, input.userId));

    let profile = existingProfile;

    if (!profile) {
      const safeName =
        input.displayName?.trim() || input.email.split("@")[0]?.slice(0, 60) || "Membre BONUVO";
      const [inserted] = await tx
        .insert(profiles)
        .values({
          id: input.userId,
          email: input.email.toLowerCase(),
          displayName: safeName,
          emailVerifiedAt: input.emailVerifiedAt ?? null,
          status: "active",
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            email: input.email.toLowerCase(),
            emailVerifiedAt: input.emailVerifiedAt ?? undefined,
          },
        })
        .returning();
      profile = inserted;
    } else if (input.emailVerifiedAt && !profile.emailVerifiedAt) {
      const [updated] = await tx
        .update(profiles)
        .set({ emailVerifiedAt: input.emailVerifiedAt })
        .where(eq(profiles.id, input.userId))
        .returning();
      if (updated) profile = updated;
    }

    let assignedRoles = await tx
      .select({ roleId: roles.id, roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, input.userId));

    if (assignedRoles.length === 0) {
      const [memberRole] = await tx.select().from(roles).where(eq(roles.name, "member"));
      if (memberRole) {
        await tx
          .insert(userRoles)
          .values({ userId: input.userId, roleId: memberRole.id })
          .onConflictDoNothing({ target: [userRoles.userId, userRoles.roleId] });
        assignedRoles = [{ roleId: memberRole.id, roleName: memberRole.name }];
      }
    }

    const permRows = await tx
      .select({ key: permissions.key })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(userRoles.userId, input.userId));

    const uniqueRoles = Array.from(new Set(assignedRoles.map((r) => r.roleName))) as RoleName[];
    const uniquePerms = Array.from(new Set(permRows.map((p) => p.key))) as PermissionKey[];

    return {
      displayName: profile?.displayName ?? input.email,
      countryCode: profile?.countryCode ?? "GLOBAL",
      locale: profile?.locale ?? "fr",
      timezone: profile?.timezone ?? "UTC",
      emailVerified: Boolean(profile?.emailVerifiedAt || input.emailVerifiedAt),
      status: profile?.status ?? "active",
      roles: uniqueRoles,
      permissions: uniquePerms,
    };
  });
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user || !userData.user.email) {
    return null;
  }

  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const aal: "aal1" | "aal2" = aalData?.currentLevel === "aal2" ? "aal2" : "aal1";

  const authUser = userData.user;
  const emailVerifiedAt = authUser.email_confirmed_at
    ? new Date(authUser.email_confirmed_at)
    : null;
  const metaName =
    typeof authUser.user_metadata?.display_name === "string"
      ? authUser.user_metadata.display_name
      : null;

  const ctx = await loadOrBootstrapProfileContext({
    userId: authUser.id,
    email: authUser.email!,
    displayName: metaName,
    emailVerifiedAt,
  });

  if (ctx.status !== "active") {
    return null;
  }

  return {
    id: authUser.id,
    email: authUser.email!,
    displayName: ctx.displayName,
    countryCode: ctx.countryCode,
    locale: ctx.locale,
    timezone: ctx.timezone,
    emailVerified: ctx.emailVerified,
    status: ctx.status,
    roles: ctx.roles,
    permissions: ctx.permissions,
    requiresTotp: roleRequiresTotp(ctx.roles),
    aal,
  };
}
