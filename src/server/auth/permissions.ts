import "server-only";

import type { PermissionKey, RoleName } from "./rbac-catalog";

export interface AuthActorSnapshot {
  id: string;
  roles: readonly string[];
  permissions: readonly string[];
}

export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  readonly status = 403;

  constructor(message = "Accès refusé.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED";
  readonly status = 401;

  constructor(message = "Authentification requise.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function hasRole(actor: AuthActorSnapshot | null | undefined, role: RoleName): boolean {
  if (!actor) return false;
  return actor.roles.includes(role);
}

export function can(
  actor: AuthActorSnapshot | null | undefined,
  permission: PermissionKey,
): boolean {
  if (!actor) return false;
  if (actor.roles.includes("super_admin")) return true;
  return actor.permissions.includes(permission);
}

export function requirePermission(
  actor: AuthActorSnapshot | null | undefined,
  permission: PermissionKey,
): void {
  if (!actor) {
    throw new UnauthorizedError();
  }
  if (!can(actor, permission)) {
    throw new ForbiddenError(`Permission requise : ${permission}`);
  }
}

/**
 * Control B7: prevents privilege escalation.
 * Only a `super_admin` may assign/revoke `super_admin` or modify any user who holds `super_admin`.
 */
export function assertCanManageTargetRole(input: {
  actor: AuthActorSnapshot;
  targetRole: RoleName;
  targetCurrentRoles: readonly string[];
}): void {
  requirePermission(input.actor, "users.manage");

  const actorIsSuperAdmin = hasRole(input.actor, "super_admin");
  if (actorIsSuperAdmin) return;

  if (input.targetRole === "super_admin") {
    throw new ForbiddenError("Seul un super_admin peut attribuer ou révoquer le rôle super_admin.");
  }

  if (input.targetCurrentRoles.includes("super_admin")) {
    throw new ForbiddenError("Un admin ne peut pas modifier les rôles d'un super_admin.");
  }
}
