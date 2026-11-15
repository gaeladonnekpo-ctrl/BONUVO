import "server-only";

import { z } from "zod";

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
});

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

export function parseServerEnv(rawEnv: Record<string, string | undefined>): ServerEnv {
  const result = fullEnvSchema.safeParse(rawEnv);
  if (!result.success) {
    throw new Error(
      `Configuration d'environnement invalide :\n${formatEnvIssues(result.error.issues)}`,
    );
  }
  return result.data;
}

export function parseClientEnv(rawEnv: Record<string, string | undefined>): ClientEnv {
  const result = clientEnvSchema.safeParse(rawEnv);
  if (!result.success) {
    throw new Error(
      `Configuration d'environnement client invalide :\n${formatEnvIssues(result.error.issues)}`,
    );
  }
  return result.data;
}
