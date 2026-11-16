import { describe, expect, it } from "vitest";
import { parseClientEnv, parseServerEnv } from "@/server/env-schema";

const validBaseEnv = {
  NODE_ENV: "development",
  APP_ENV: "local",
  DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/bonuvo_dev",
  DATABASE_SSL: "require",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_NAME: "BONUVO",
};

const validExternalEnv = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_example_key",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_example_key",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "upstash_example_token",
  RESEND_API_KEY: "re_example_key",
  EMAIL_FROM: "BONUVO <noreply@bonuvo.example>",
  IP_HASH_SECRET: "0123456789abcdef0123456789abcdef",
};

describe("env-schema", () => {
  it("valide une configuration locale complète et correcte", () => {
    const parsed = parseServerEnv({ ...validBaseEnv, ...validExternalEnv });
    expect(parsed.APP_ENV).toBe("local");
    expect(parsed.DATABASE_URL).toBe(validBaseEnv.DATABASE_URL);
    expect(parsed.NEXT_PUBLIC_APP_NAME).toBe("BONUVO");
    expect(parsed.SUPABASE_URL).toBe(validExternalEnv.SUPABASE_URL);
  });

  it("échoue explicitement si DATABASE_URL est absent", () => {
    const { DATABASE_URL: _removed, ...incomplete } = validBaseEnv;
    expect(() => parseServerEnv(incomplete)).toThrowError(/DATABASE_URL/);
  });

  it("échoue explicitement si DATABASE_URL n'est pas une URL PostgreSQL", () => {
    expect(() =>
      parseServerEnv({
        ...validBaseEnv,
        DATABASE_URL: "mysql://localhost:3306/db",
      }),
    ).toThrowError(/DATABASE_URL/);
  });

  it("échoue si NEXT_PUBLIC_SITE_URL est absent ou invalide", () => {
    expect(() =>
      parseServerEnv({
        ...validBaseEnv,
        NEXT_PUBLIC_SITE_URL: "not-a-url",
      }),
    ).toThrowError(/NEXT_PUBLIC_SITE_URL/);
  });

  it("refuse DATABASE_SSL=disable en production ou preview", () => {
    expect(() =>
      parseServerEnv({
        ...validBaseEnv,
        ...validExternalEnv,
        APP_ENV: "production",
        DATABASE_SSL: "disable",
        NEXT_PUBLIC_SITE_URL: "https://bonuvo.example",
      }),
    ).toThrowError(/DATABASE_SSL/);
  });

  it("exige https:// pour NEXT_PUBLIC_SITE_URL en production", () => {
    expect(() =>
      parseServerEnv({
        ...validBaseEnv,
        ...validExternalEnv,
        APP_ENV: "production",
        DATABASE_SSL: "require",
        NEXT_PUBLIC_SITE_URL: "http://bonuvo.example",
      }),
    ).toThrowError(/NEXT_PUBLIC_SITE_URL/);
  });

  it("exige les secrets Supabase Auth, Upstash, Resend et IP_HASH_SECRET en preview et production", () => {
    expect(() =>
      parseServerEnv({
        ...validBaseEnv,
        APP_ENV: "preview",
        NEXT_PUBLIC_SITE_URL: "https://preview.bonuvo.example",
      }),
    ).toThrowError(
      /SUPABASE_URL[\s\S]*UPSTASH_REDIS_REST_URL[\s\S]*RESEND_API_KEY[\s\S]*IP_HASH_SECRET/,
    );
  });

  it("rejette IP_HASH_SECRET trop court ou SUPABASE_URL non HTTPS même en local", () => {
    expect(() =>
      parseServerEnv({
        ...validBaseEnv,
        SUPABASE_URL: "http://example.supabase.co",
        IP_HASH_SECRET: "trop-court",
      }),
    ).toThrowError(/SUPABASE_URL[\s\S]*IP_HASH_SECRET/);
  });

  it("valide le sous-ensemble client indépendamment des secrets serveur", () => {
    const client = parseClientEnv({
      NEXT_PUBLIC_SITE_URL: "https://bonuvo.example",
      NEXT_PUBLIC_APP_NAME: "BONUVO",
    });
    expect(client.NEXT_PUBLIC_SITE_URL).toBe("https://bonuvo.example");
  });

  it("prend en charge POSTGRES_URL et les variables Vercel en preview", () => {
    const parsed = parseServerEnv({
      NODE_ENV: "production",
      POSTGRES_URL: "postgresql://user:pass@pooler.example:6543/postgres?supa=base-pooler.x",
      VERCEL_ENV: "preview",
      VERCEL_URL: "bonuvo-preview.vercel.app",
      ...validExternalEnv,
    });
    expect(parsed.APP_ENV).toBe("preview");
    expect(parsed.DATABASE_URL).toContain("pooler.example:6543");
    expect(parsed.NEXT_PUBLIC_SITE_URL).toBe("https://bonuvo-preview.vercel.app");
    expect(parsed.DATABASE_SSL).toBe("require");
  });
});
