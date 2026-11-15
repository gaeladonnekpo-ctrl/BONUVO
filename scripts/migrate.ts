import dotenv from "dotenv";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { parseServerEnv } from "@/server/env-schema";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

async function runMigrations(): Promise<void> {
  const env = parseServerEnv(process.env);
  const ssl =
    env.DATABASE_SSL === "disable"
      ? false
      : env.DATABASE_SSL === "verify-full"
        ? "verify-full"
        : "require";

  const sqlClient = postgres(env.DATABASE_URL, {
    max: 1,
    prepare: false,
    ssl,
  });

  try {
    const db = drizzle(sqlClient);
    await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
    console.log("Migrations Drizzle appliquées avec succès.");
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}

runMigrations().catch((error) => {
  console.error(
    "Échec de l'exécution des migrations :",
    error instanceof Error ? error.message : "erreur inconnue",
  );
  process.exit(1);
});
