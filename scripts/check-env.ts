import dotenv from "dotenv";
import path from "node:path";
import { parseServerEnv } from "@/server/env-schema";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

try {
  const env = parseServerEnv(process.env);
  console.log(
    `Environnement valide (APP_ENV=${env.APP_ENV}, DATABASE_SSL=${env.DATABASE_SSL}, NEXT_PUBLIC_APP_NAME=${env.NEXT_PUBLIC_APP_NAME}).`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Erreur de validation d'environnement.");
  process.exit(1);
}
