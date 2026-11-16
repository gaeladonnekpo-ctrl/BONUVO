import dotenv from "dotenv";
import path from "node:path";
import { and, eq, inArray, sql } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { buildIsoCountriesSeed } from "@/lib/i18n/iso-countries";
import { PERMISSION_CATALOG, ROLE_CATALOG } from "@/server/auth/rbac-catalog";
import { resolveSslOption, sanitizePostgresUrl } from "@/server/db/connection-config";
import * as schema from "@/server/db/schema";
import { parseServerEnv } from "@/server/env-schema";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const DEFAULT_PAYMENT_METHODS = [
  { slug: "mobile-money", name: "Mobile Money", category: "mobile_money" as const },
  { slug: "orange-money", name: "Orange Money", category: "mobile_money" as const },
  { slug: "mtn-momo", name: "MTN MoMo", category: "mobile_money" as const },
  { slug: "moov-money", name: "Moov Money", category: "mobile_money" as const },
  { slug: "wave", name: "Wave", category: "mobile_money" as const },
  { slug: "card", name: "Carte bancaire", category: "card" as const },
  { slug: "bank-transfer", name: "Virement bancaire", category: "bank_transfer" as const },
  { slug: "e-wallet", name: "Portefeuille électronique", category: "e_wallet" as const },
  { slug: "crypto", name: "Cryptomonnaie", category: "crypto" as const },
] as const;

const DEFAULT_SETTINGS = [
  {
    key: "catalog.freshness_warning_days",
    value: { days: 30 },
    description: "Nombre de jours sans vérification manuelle avant alerte dans le back-office.",
  },
  {
    key: "offers.default_sort",
    value: { strategy: "country_rank_then_rating_then_verified_at" },
    description: "Ordre de tri public par défaut des offres par pays.",
  },
  {
    key: "admin.audit_retention_days",
    value: { days: 365 },
    description: "Durée cible de conservation consultable des journaux.",
  },
] as const;

export async function seedRbacReference(): Promise<{
  rolesCount: number;
  permissionsCount: number;
  linksCount: number;
  countriesCount: number;
  paymentMethodsCount: number;
  settingsCount: number;
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

      const isoCountries = buildIsoCountriesSeed();
      await tx
        .insert(schema.countries)
        .values(isoCountries)
        .onConflictDoUpdate({
          target: schema.countries.code,
          set: {
            nameFr: sql`excluded.name_fr`,
            nameEn: sql`excluded.name_en`,
            updatedAt: new Date(),
          },
        });

      await tx
        .insert(schema.paymentMethods)
        .values(DEFAULT_PAYMENT_METHODS.map((pm) => ({ ...pm, active: true })))
        .onConflictDoNothing({ target: schema.paymentMethods.slug });

      await tx
        .insert(schema.settings)
        .values(DEFAULT_SETTINGS.map((s) => ({ ...s })))
        .onConflictDoNothing({ target: schema.settings.key });

      return {
        rolesCount: ROLE_CATALOG.length,
        permissionsCount: PERMISSION_CATALOG.length,
        linksCount,
        countriesCount: isoCountries.length,
        paymentMethodsCount: DEFAULT_PAYMENT_METHODS.length,
        settingsCount: DEFAULT_SETTINGS.length,
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
        `Référentiel semé : ${res.rolesCount} rôles, ${res.permissionsCount} permissions, ${res.linksCount} liens, ${res.countriesCount} pays ISO 3166, ${res.paymentMethodsCount} moyens de paiement, ${res.settingsCount} paramètres.`,
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
