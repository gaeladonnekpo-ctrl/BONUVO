import "server-only";

const STRIPPED_POOLER_QUERY_PARAMS = [
  "supa",
  "pgbouncer",
  "connection_limit",
  "pool_timeout",
  "sslmode",
] as const;

export function resolveSslOption(mode: "require" | "verify-full" | "disable") {
  if (mode === "disable") return false as const;
  if (mode === "verify-full") return "verify-full" as const;
  return "require" as const;
}

/**
 * Strips pooler/ORM-specific query parameters (such as `supa`, `pgbouncer`, or
 * `sslmode`) before passing a connection URI to `postgres.js`, preventing them
 * from being forwarded as unsupported PostgreSQL startup parameters.
 */
export function sanitizePostgresUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  for (const key of STRIPPED_POOLER_QUERY_PARAMS) {
    parsed.searchParams.delete(key);
  }
  return parsed.toString();
}
