import dotenv from "dotenv";
import path from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { PERMISSION_CATALOG, ROLE_CATALOG } from "@/server/auth/rbac-catalog";
import { resolveSslOption, sanitizePostgresUrl } from "@/server/db/connection-config";
import * as schema from "@/server/db/schema";
import { parseServerEnv } from "@/server/env-schema";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

export async function seedRbacReference(): Promise<{
  rolesCount: number;
  permissionsCount: number;
  linksCount: number;
}> {
  const env = parseServerEnv(process.env);
  const sqlClient = postgres(sanitizePostgresUrl(env.DATABASE_URL), {
    max: 1,
    prepare: false,
    ssl: resolveSslOption(env.DATABASE_SSL),
  });

  try {
    const db = drizzle(sqlClient, { schema });

    return await db.transaction(async (tx) => {
      for (const perm of PERMISSION_CATALOG) {
        await tx
          .insert(schema.permissions)
          .values({ key: perm.key, description: perm.description })
          .onConflictDoUpdate({
            target: schema.permissions.key,
            set: { description: perm.description, updatedAt: new Date() },
          });
      }

      for (const role of ROLE_CATALOG) {
        await tx
          .insert(schema.roles)
          .values({
            name: role.name,
            description: role.description,
            requiresTotp: role.requiresTotp,
          })
          .onConflictDoUpdate({
            target: schema.roles.name,
            set: {
              description: role.description,
              requiresTotp: role.requiresTotp,
              updatedAt: new Date(),
            },
          });
      }

      const allRoles = await tx.select().from(schema.roles);
      const allPerms = await tx.select().from(schema.permissions);
      const roleByName = new Map(allRoles.map((r) => [r.name, r.id]));
      const permByKey = new Map(allPerms.map((p) => [p.key, p.id]));

      let linksCount = 0;
      for (const roleDef of ROLE_CATALOG) {
        const roleId = roleByName.get(roleDef.name);
        if (!roleId) continue;

        const targetPermIds = roleDef.permissions
          .map((key) => permByKey.get(key))
          .filter((id): id is string => Boolean(id));

        if (targetPermIds.length > 0) {
          await tx
            .insert(schema.rolePermissions)
            .values(targetPermIds.map((permissionId) => ({ roleId, permissionId })))
            .onConflictDoNothing({
              target: [schema.rolePermissions.roleId, schema.rolePermissions.permissionId],
            });
        }

        const targetSet = new Set(targetPermIds);
        const existingLinks = await tx
          .select({
            id: schema.rolePermissions.id,
            permissionId: schema.rolePermissions.permissionId,
          })
          .from(schema.rolePermissions)
          .where(eq(schema.rolePermissions.roleId, roleId));

        const obsoleteIds = existingLinks
          .filter((row) => !targetSet.has(row.permissionId))
          .map((row) => row.id);

        if (obsoleteIds.length > 0) {
          await tx
            .delete(schema.rolePermissions)
            .where(
              and(
                eq(schema.rolePermissions.roleId, roleId),
                inArray(schema.rolePermissions.id, obsoleteIds),
              ),
            );
        }

        linksCount += targetPermIds.length;
      }

      return {
        rolesCount: ROLE_CATALOG.length,
        permissionsCount: PERMISSION_CATALOG.length,
        linksCount,
      };
    });
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}

const isCliEntry = process.argv[1]?.endsWith("seed-reference.ts") ?? false;
if (isCliEntry) {
  seedRbacReference()
    .then((res) => {
      console.log(
        `Référentiel RBAC semé : ${res.rolesCount} rôles, ${res.permissionsCount} permissions, ${res.linksCount} associations.`,
      );
    })
    .catch((error) => {
      console.error(
        "Échec du seed RBAC :",
        error instanceof Error ? error.message : "erreur inconnue",
      );
      process.exit(1);
    });
}
