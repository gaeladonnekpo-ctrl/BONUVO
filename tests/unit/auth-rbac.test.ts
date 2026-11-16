import { describe, expect, it } from "vitest";
import { signUpSchema, strongPasswordSchema } from "@/modules/auth/schema";
import {
  assertCanManageTargetRole,
  can,
  ForbiddenError,
  requirePermission,
  type AuthActorSnapshot,
} from "@/server/auth/permissions";
import { ROLE_CATALOG } from "@/server/auth/rbac-catalog";

function actorForRole(
  roleName: "super_admin" | "admin" | "editor" | "analyst" | "member",
): AuthActorSnapshot {
  const def = ROLE_CATALOG.find((r) => r.name === roleName)!;
  return {
    id: "11111111-1111-4111-8111-111111111111",
    roles: [def.name],
    permissions: [...def.permissions],
  };
}

describe("Phase 2 — Politique mot de passe & matrice RBAC (B7)", () => {
  it("impose 12 caractères minimum, complexité et rejet des mots de passe compromis (contrôle A1)", () => {
    expect(strongPasswordSchema.safeParse("Short1A").success).toBe(false);
    expect(strongPasswordSchema.safeParse("password123456").success).toBe(false);
    expect(strongPasswordSchema.safeParse("alllowercasepassword1").success).toBe(false);
    expect(strongPasswordSchema.safeParse("BonuvoStrong2026").success).toBe(true);

    const invalidSignup = signUpSchema.safeParse({
      email: "user@example.com",
      password: "Password1",
      displayName: "Membre",
      locale: "fr",
    });
    expect(invalidSignup.success).toBe(false);
  });

  it("refuse toute permission admin au rôle member et respecte le moindre privilège par rôle", () => {
    const member = actorForRole("member");
    const analyst = actorForRole("analyst");
    const editor = actorForRole("editor");
    const admin = actorForRole("admin");

    expect(can(member, "admin.access")).toBe(false);
    expect(() => requirePermission(member, "offers.write")).toThrowError(ForbiddenError);

    expect(can(analyst, "stats.export")).toBe(true);
    expect(can(analyst, "offers.write")).toBe(false);

    expect(can(editor, "offers.write")).toBe(true);
    expect(can(editor, "offers.publish")).toBe(false);

    expect(can(admin, "users.manage")).toBe(true);
    expect(can(admin, "settings.read")).toBe(true);
    expect(can(admin, "settings.manage")).toBe(false);
  });

  it("empêche toute élévation de privilèges d'un admin envers super_admin (contrôle B7)", () => {
    const admin = actorForRole("admin");
    const superAdmin = actorForRole("super_admin");

    expect(() =>
      assertCanManageTargetRole({
        actor: admin,
        targetRole: "super_admin",
        targetCurrentRoles: ["member"],
      }),
    ).toThrowError(ForbiddenError);

    expect(() =>
      assertCanManageTargetRole({
        actor: admin,
        targetRole: "editor",
        targetCurrentRoles: ["super_admin"],
      }),
    ).toThrowError(ForbiddenError);

    expect(() =>
      assertCanManageTargetRole({
        actor: admin,
        targetRole: "editor",
        targetCurrentRoles: ["member"],
      }),
    ).not.toThrow();

    expect(() =>
      assertCanManageTargetRole({
        actor: superAdmin,
        targetRole: "super_admin",
        targetCurrentRoles: ["admin"],
      }),
    ).not.toThrow();
  });
});
