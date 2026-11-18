import "server-only";

import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { getServerEnv } from "@/server/env";
import { resolveSslOption, sanitizePostgresUrl } from "./connection-config";
import * as schema from "./schema";

export type AppDatabase = PostgresJsDatabase<typeof schema>;

let clientInstance: Sql | null = null;
let dbInstance: AppDatabase | null = null;

export function getSqlClient(): Sql {
  if (!clientInstance) {
    const env = getServerEnv();
    clientInstance = postgres(sanitizePostgresUrl(env.DATABASE_URL), {
      prepare: false,
      max: 4,
      connect_timeout: 20,
      idle_timeout: 60,
      ssl: resolveSslOption(env.DATABASE_SSL),
    });
  }
  return clientInstance;
}

export function getDb(): AppDatabase {
  if (!dbInstance) {
    dbInstance = drizzle(getSqlClient(), { schema });
  }
  return dbInstance;
}

export async function pingDatabase(): Promise<boolean> {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}
