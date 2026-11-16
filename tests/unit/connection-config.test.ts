import { describe, expect, it } from "vitest";
import { resolveSslOption, sanitizePostgresUrl } from "@/server/db/connection-config";

describe("connection-config", () => {
  it("supprime les paramètres de pooler non supportés par postgres.js", () => {
    const sanitized = sanitizePostgresUrl(
      "postgres://postgres.demo:secret@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x&pgbouncer=true&application_name=bonuvo",
    );
    expect(sanitized).toBe(
      "postgres://postgres.demo:secret@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?application_name=bonuvo",
    );
  });

  it("résout les modes SSL attendus", () => {
    expect(resolveSslOption("require")).toBe("require");
    expect(resolveSslOption("verify-full")).toBe("verify-full");
    expect(resolveSslOption("disable")).toBe(false);
  });
});
