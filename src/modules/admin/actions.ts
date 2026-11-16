"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ZodError } from "zod";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { requireActionPermission } from "@/server/auth/guards";
import { ForbiddenError, UnauthorizedError } from "@/server/auth/permissions";
import type { PermissionKey } from "@/server/auth/rbac-catalog";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";
import {
  assignUserRole,
  revokeUserRole,
  setUserStatus,
  updateSettingForAdmin,
} from "@/modules/admin/service";

async function runAdminAction(
  permission: PermissionKey,
  paths: string[],
  executor: (
    actorId: string,
    actor: Awaited<ReturnType<typeof requireActionPermission>>,
    ipHash: string | null,
  ) => Promise<void>,
  successMessage: string,
): Promise<AdminActionResult> {
  try {
    const actor = await requireActionPermission(permission);
    const reqHeaders = await headers();
    const env = getServerEnv();
    const ipHash = hashIp(extractTrustedClientIp(reqHeaders, env.APP_ENV), env.IP_HASH_SECRET);
    await executor(actor.id, actor, ipHash);
    for (const p of paths) revalidatePath(p);
    return { ok: true, message: successMessage };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message ?? "Entrée invalide.",
      };
    }
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return { ok: false, code: error.code, message: error.message };
    }
    if (error instanceof Error && error.message === "INVALID_SETTING_JSON") {
      return {
        ok: false,
        code: "INVALID_SETTING_JSON",
        message: "La valeur doit être un objet JSON valide.",
      };
    }
    return {
      ok: false,
      code: "ADMIN_ACTION_FAILED",
      message: "Action d'administration refusée ou impossible.",
    };
  }
}

export async function assignRoleAction(userId: string, roleName: string) {
  return runAdminAction(
    "users.manage",
    ["/fr/admin/utilisateurs", "/en/admin/utilisateurs"],
    (_id, actor, ipHash) => assignUserRole(actor, { userId, roleName }, ipHash),
    "Rôle attribué.",
  );
}

export async function revokeRoleAction(userId: string, roleName: string) {
  return runAdminAction(
    "users.manage",
    ["/fr/admin/utilisateurs", "/en/admin/utilisateurs"],
    (_id, actor, ipHash) => revokeUserRole(actor, { userId, roleName }, ipHash),
    "Rôle révoqué.",
  );
}

export async function setUserStatusAction(userId: string, status: "active" | "suspended") {
  return runAdminAction(
    "users.manage",
    ["/fr/admin/utilisateurs", "/en/admin/utilisateurs"],
    (_id, actor, ipHash) => setUserStatus(actor, { userId, status }, ipHash),
    "Statut utilisateur mis à jour.",
  );
}

export async function updateSettingAction(input: {
  key: string;
  valueJson: string;
  description?: string;
}) {
  return runAdminAction(
    "settings.manage",
    ["/fr/admin/parametres", "/en/admin/parametres", "/fr/admin"],
    (_id, actor, ipHash) => updateSettingForAdmin(actor, input, ipHash),
    "Paramètre enregistré.",
  );
}
