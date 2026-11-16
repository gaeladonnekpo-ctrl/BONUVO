import "server-only";

import { z } from "zod";

const optionalTrimmed = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalHttpsUrl = (label: string) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .url(`${label} doit être une URL valide.`)
      .refine((url) => url.startsWith("https://"), `${label} doit utiliser https://.`)
      .optional(),
  );

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().trim().url("NEXT_PUBLIC_SITE_URL doit être une URL valide."),
  NEXT_PUBLIC_APP_NAME: z.string().trim().min(1).default("BONUVO"),
});

export const serverOnlyEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["local", "preview", "production"]).default("local"),
  DATABASE_URL: z
    .string()
    .trim()
    .min(1, "DATABASE_URL est obligatoire.")
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL doit utiliser le protocole postgres:// ou postgresql://.",
    ),
  DATABASE_SSL: z.enum(["require", "verify-full", "disable"]).default("require"),
  SUPABASE_URL: optionalHttpsUrl("SUPABASE_URL"),
  SUPABASE_ANON_KEY: optionalTrimmed,
  SUPABASE_SERVICE_ROLE_KEY: optionalTrimmed,
  UPSTASH_REDIS_REST_URL: optionalHttpsUrl("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: optionalTrimmed,
  RESEND_API_KEY: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .refine((key) => key.startsWith("re_"), "RESEND_API_KEY doit commencer par re_.")
      .optional(),
  ),
  EMAIL_FROM: optionalTrimmed,
  RESEND_WEBHOOK_SECRET: optionalTrimmed,
  IP_HASH_SECRET: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(32, "IP_HASH_SECRET doit contenir au moins 32 caractères.").optional(),
  ),
});

const STRICT_EXTERNAL_ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "IP_HASH_SECRET",
] as const;

export const fullEnvSchema = serverOnlyEnvSchema.merge(clientEnvSchema).superRefine((data, ctx) => {
  if (
    (data.APP_ENV === "preview" || data.APP_ENV === "production") &&
    data.DATABASE_SSL === "disable"
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["DATABASE_SSL"],
      message: "DATABASE_SSL ne peut pas être 'disable' en environnement preview ou production.",
    });
  }

  if (data.APP_ENV === "production" && !data.NEXT_PUBLIC_SITE_URL.startsWith("https://")) {
    ctx.addIssue({
      code: "custom",
      path: ["NEXT_PUBLIC_SITE_URL"],
      message: "NEXT_PUBLIC_SITE_URL doit utiliser https:// en production.",
    });
  }

  if (data.APP_ENV === "preview" || data.APP_ENV === "production") {
    for (const key of STRICT_EXTERNAL_ENV_KEYS) {
      if (!data[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} est obligatoire en environnement ${data.APP_ENV}.`,
        });
      }
    }
  }
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof fullEnvSchema>;

function formatEnvIssues(issues: readonly z.ZodIssue[]): string {
  return issues
    .map((issue) => {
      const key = issue.path.length > 0 ? issue.path.join(".") : "ENV";
      return `- ${key}: ${issue.message}`;
    })
    .join("\n");
}

function resolveVercelAppEnv(vercelEnv: string | undefined): string | undefined {
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  return undefined;
}

function normalizeServerRawEnv(
  rawEnv: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const appEnv = rawEnv.APP_ENV || resolveVercelAppEnv(rawEnv.VERCEL_ENV);
  const vercelHost =
    appEnv === "production"
      ? rawEnv.VERCEL_PROJECT_PRODUCTION_URL || rawEnv.VERCEL_URL
      : rawEnv.VERCEL_URL;

  return {
    ...rawEnv,
    APP_ENV: appEnv,
    DATABASE_URL: rawEnv.DATABASE_URL || rawEnv.POSTGRES_URL,
    UPSTASH_REDIS_REST_URL: rawEnv.UPSTASH_REDIS_REST_URL || rawEnv.KV_REST_API_URL,
    UPSTASH_REDIS_REST_TOKEN: rawEnv.UPSTASH_REDIS_REST_TOKEN || rawEnv.KV_REST_API_TOKEN,
    NEXT_PUBLIC_SITE_URL:
      rawEnv.NEXT_PUBLIC_SITE_URL || (vercelHost ? `https://${vercelHost}` : undefined),
  };
}

export function parseServerEnv(rawEnv: Record<string, string | undefined>): ServerEnv {
  const result = fullEnvSchema.safeParse(normalizeServerRawEnv(rawEnv));
  if (!result.success) {
    throw new Error(
      `Configuration d'environnement invalide :\n${formatEnvIssues(result.error.issues)}`,
    );
  }
  return result.data;
}

export function parseClientEnv(rawEnv: Record<string, string | undefined>): ClientEnv {
  const normalized = {
    ...rawEnv,
    NEXT_PUBLIC_SITE_URL:
      rawEnv.NEXT_PUBLIC_SITE_URL ||
      (rawEnv.NEXT_PUBLIC_VERCEL_URL ? `https://${rawEnv.NEXT_PUBLIC_VERCEL_URL}` : undefined),
  };
  const result = clientEnvSchema.safeParse(normalized);
  if (!result.success) {
    throw new Error(`Configuration client invalide :\n${formatEnvIssues(result.error.issues)}`);
  }
  return result.data;
}
