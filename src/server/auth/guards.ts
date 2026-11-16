import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logSecurityEvent } from "@/server/audit/log";
import {
  can,
  ForbiddenError,
  UnauthorizedError,
  requirePermission,
} from "@/server/auth/permissions";
import type { PermissionKey } from "@/server/auth/rbac-catalog";
import { getCurrentUser, type AuthenticatedUser } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";

async function auditDeniedAccess(input: {
  userId?: string | null;
  eventType: "access_denied" | "permission_denied";
  route?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const reqHeaders = await headers();
    const env = getServerEnv();
    const ip = extractTrustedClientIp(reqHeaders, env.APP_ENV);
    await logSecurityEvent({
      userId: input.userId ?? null,
      eventType: input.eventType,
      severity: "warning",
      ipHash: hashIp(ip),
      route: input.route ?? null,
      details: input.details ?? {},
    });
  } catch {
    // Do not mask access denial response if header/logging lookup fails
  }
}

export async function requireUser(locale: string): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/connexion`);
  }
  return user;
}

export async function requireEmailVerified(locale: string): Promise<AuthenticatedUser> {
  const user = await requireUser(locale);
  if (!user.emailVerified) {
    await auditDeniedAccess({
      userId: user.id,
      eventType: "access_denied",
      details: { reason: "email_unverified" },
    });
    redirect(`/${locale}/verification`);
  }
  return user;
}

export async function requireAdminAccess(
  locale: string,
  permission: PermissionKey = "admin.access",
): Promise<AuthenticatedUser> {
  const user = await requireEmailVerified(locale);

  if (!can(user, permission)) {
    await auditDeniedAccess({
      userId: user.id,
      eventType: "permission_denied",
      details: { requiredPermission: permission },
    });
    redirect(`/${locale}`);
  }

  if (user.requiresTotp && user.aal !== "aal2") {
    await auditDeniedAccess({
      userId: user.id,
      eventType: "access_denied",
      details: { reason: "totp_aal2_required" },
    });
    redirect(`/${locale}/double-authentification`);
  }

  return user;
}

export async function requireActionUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    await auditDeniedAccess({ eventType: "access_denied", details: { reason: "unauthenticated" } });
    throw new UnauthorizedError();
  }
  if (!user.emailVerified) {
    await auditDeniedAccess({
      userId: user.id,
      eventType: "access_denied",
      details: { reason: "email_unverified" },
    });
    throw new ForbiddenError("Vérification d'e-mail requise.");
  }
  return user;
}

export async function requireActionPermission(
  permission: PermissionKey,
  options?: { requireAdminTotp?: boolean },
): Promise<AuthenticatedUser> {
  const user = await requireActionUser();
  try {
    requirePermission(user, permission);
  } catch (error) {
    await auditDeniedAccess({
      userId: user.id,
      eventType: "permission_denied",
      details: { requiredPermission: permission },
    });
    throw error;
  }

  const mustCheckTotp = options?.requireAdminTotp ?? true;
  if (mustCheckTotp && user.requiresTotp && user.aal !== "aal2") {
    await auditDeniedAccess({
      userId: user.id,
      eventType: "access_denied",
      details: { reason: "totp_aal2_required", requiredPermission: permission },
    });
    throw new ForbiddenError("Double authentification TOTP requise pour l'administration.");
  }

  return user;
}
