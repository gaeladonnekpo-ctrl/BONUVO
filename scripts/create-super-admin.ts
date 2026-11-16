import dotenv from "dotenv";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { resolveSslOption, sanitizePostgresUrl } from "@/server/db/connection-config";
import * as schema from "@/server/db/schema";
import { parseServerEnv } from "@/server/env-schema";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

function readFlag(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function confirmHumanExecution(email: string): Promise<boolean> {
  if (process.argv.includes("--yes")) {
    return true;
  }
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(
      `Confirmez-vous la création/promotion du super_admin pour "${email}" ? (tapez OUI) : `,
    );
    return answer.trim() === "OUI";
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const env = parseServerEnv(process.env);
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour créer un super_admin.",
    );
  }

  const email = readFlag("email")?.trim().toLowerCase();
  const displayName = readFlag("name")?.trim() || "Super Admin BONUVO";
  const password = process.env.SUPER_ADMIN_INITIAL_PASSWORD;

  if (!email) {
    throw new Error("Argument --email=<adresse> obligatoire.");
  }

  if (!password || password.length < 12) {
    throw new Error(
      "Variable d'environnement SUPER_ADMIN_INITIAL_PASSWORD (>= 12 caractères) requise pour le script.",
    );
  }

  const confirmed = await confirmHumanExecution(email);
  if (!confirmed) {
    console.log("Opération annulée par l'opérateur.");
    process.exit(0);
  }

  const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existingList = await adminClient.auth.admin.listUsers();
  if (existingList.error) {
    throw new Error(`Impossible de consulter auth.users : ${existingList.error.message}`);
  }

  const existingAuthUser = existingList.data.users.find((u) => u.email?.toLowerCase() === email);

  let userId: string;
  if (existingAuthUser) {
    userId = existingAuthUser.id;
  } else {
    const created = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message || "Échec de création utilisateur Supabase Auth.");
    }
    userId = created.data.user.id;
  }

  const sqlClient = postgres(sanitizePostgresUrl(env.DATABASE_URL), {
    max: 1,
    prepare: false,
    ssl: resolveSslOption(env.DATABASE_SSL),
  });

  try {
    const db = drizzle(sqlClient, { schema });
    await db.transaction(async (tx) => {
      await tx
        .insert(schema.profiles)
        .values({
          id: userId,
          email,
          displayName,
          emailVerifiedAt: new Date(),
          status: "active",
        })
        .onConflictDoUpdate({
          target: schema.profiles.id,
          set: {
            email,
            displayName,
            emailVerifiedAt: new Date(),
            updatedAt: new Date(),
          },
        });

      const [superAdminRole] = await tx
        .select()
        .from(schema.roles)
        .where(eq(schema.roles.name, "super_admin"));

      if (!superAdminRole) {
        throw new Error("Rôle super_admin introuvable : exécutez d'abord npm run db:seed.");
      }

      await tx
        .insert(schema.userRoles)
        .values({
          userId,
          roleId: superAdminRole.id,
        })
        .onConflictDoNothing({
          target: [schema.userRoles.userId, schema.userRoles.roleId],
        });

      await tx.insert(schema.auditLog).values({
        actorId: userId,
        action: "user.super_admin_bootstrapped",
        entityType: "user_roles",
        entityId: userId,
        beforeState: null,
        afterState: { role: "super_admin", email },
      });
    });

    console.log(
      `Compte super_admin prêt (${email}, id=${userId}). Activez la double authentification TOTP dès la première connexion sur /fr/double-authentification.`,
    );
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(
    "Échec création super_admin :",
    error instanceof Error ? error.message : "erreur inconnue",
  );
  process.exit(1);
});
