import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyResendWebhook } from "@/server/email/mailer";
import { extractTrustedClientIp, hashIdentifier, hashIp } from "@/server/security/ip";
import { checkSameOrigin } from "@/server/security/origin";
import { redactRecord, redactStringSecrets } from "@/server/security/redact";
import { sanitizeRelativeRedirect } from "@/server/security/redirect";

describe("Phase 2 — Security primitives", () => {
  it("extrait l'IP plateforme et ignore X-Forwarded-For forgé hors environnement local", () => {
    const forgedProd = new Headers({
      "x-forwarded-for": "198.51.100.77",
      "x-vercel-forwarded-for": "203.0.113.10",
    });
    expect(extractTrustedClientIp(forgedProd, "production")).toBe("203.0.113.10");

    const spoofedOnly = new Headers({ "x-forwarded-for": "198.51.100.77" });
    expect(extractTrustedClientIp(spoofedOnly, "production")).toBe("untrusted-unknown-ip");
    expect(extractTrustedClientIp(spoofedOnly, "local")).toBe("198.51.100.77");
  });

  it("hache IP et identifiants par HMAC-SHA256 sans exposer la valeur en clair", () => {
    const secret = "0123456789abcdef0123456789abcdef";
    const hIp = hashIp("203.0.113.10", secret);
    const hId = hashIdentifier("User@Example.com", secret);
    expect(hIp).toMatch(/^[a-f0-9]{64}$/);
    expect(hId).toMatch(/^[a-f0-9]{64}$/);
    expect(hIp).not.toContain("203.0.113.10");
    expect(hId).not.toContain("example.com");
    expect(hId).toBe(hashIdentifier("user@example.com", secret));
  });

  it("bloque toute redirection ouverte (contrôle V4)", () => {
    expect(sanitizeRelativeRedirect("/fr/compte?tab=profil", "/fr")).toBe("/fr/compte?tab=profil");
    expect(sanitizeRelativeRedirect("https://evil.example/phish", "/fr")).toBe("/fr");
    expect(sanitizeRelativeRedirect("//evil.example/phish", "/fr")).toBe("/fr");
    expect(sanitizeRelativeRedirect("/\\evil.example", "/fr")).toBe("/fr");
    expect(sanitizeRelativeRedirect("javascript:alert(1)", "/fr")).toBe("/fr");
    expect(sanitizeRelativeRedirect("/fr/admin\r\nSet-Cookie: a=b", "/fr")).toBe("/fr");
  });

  it("vérifie la même origine et rejette les requêtes CSRF cross-site (contrôle V3)", () => {
    const okHeaders = new Headers({
      host: "bonuvo.example",
      origin: "https://bonuvo.example",
    });
    expect(checkSameOrigin(okHeaders, "https://bonuvo.example").allowed).toBe(true);

    const badOrigin = new Headers({
      host: "bonuvo.example",
      origin: "https://attacker.example",
    });
    expect(checkSameOrigin(badOrigin, "https://bonuvo.example").allowed).toBe(false);

    const badFetchSite = new Headers({
      host: "bonuvo.example",
      "sec-fetch-site": "cross-site",
    });
    expect(checkSameOrigin(badFetchSite, "https://bonuvo.example").allowed).toBe(false);
  });

  it("masque mots de passe, jetons, cookies et URLs avec secrets (contrôle E6)", () => {
    const cleaned = redactRecord({
      email: "user@example.com",
      password: "SuperPassword123",
      refreshToken: "tok_secret_value",
      nested: { cookie: "sb=secret", safe: "ok" },
    });
    expect(cleaned).toEqual({
      email: "user@example.com",
      password: "[REDACTED]",
      refreshToken: "[REDACTED]",
      nested: { cookie: "[REDACTED]", safe: "ok" },
    });
    expect(
      redactStringSecrets(
        "postgres://admin:verysecret@db.example:5432/postgres Bearer abcdef123456",
      ),
    ).toBe("postgres://admin:[REDACTED]@db.example:5432/postgres Bearer [REDACTED]");
  });

  it("valide la signature webhook Resend et rejette les événements de plus de 5 minutes", () => {
    const rawKey = Buffer.from("0123456789abcdef0123456789abcdef");
    const secret = `whsec_${rawKey.toString("base64")}`;
    const msgId = "msg_test_123";
    const nowUnix = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      type: "email.bounced",
      created_at: new Date().toISOString(),
      data: { to: ["bounce@example.com"] },
    });

    const signedContent = `${msgId}.${nowUnix}.${payload}`;
    const sig = createHmac("sha256", rawKey).update(signedContent).digest("base64");

    const verified = verifyResendWebhook({
      payload,
      headers: {
        id: msgId,
        timestamp: String(nowUnix),
        signature: `v1,${sig}`,
      },
      webhookSecret: secret,
      nowUnixSeconds: nowUnix + 30,
    });
    expect(verified.type).toBe("email.bounced");

    expect(() =>
      verifyResendWebhook({
        payload,
        headers: {
          id: msgId,
          timestamp: String(nowUnix - 360),
          signature: `v1,${sig}`,
        },
        webhookSecret: secret,
        nowUnixSeconds: nowUnix,
      }),
    ).toThrow(/fenêtre/);

    expect(() =>
      verifyResendWebhook({
        payload,
        headers: {
          id: msgId,
          timestamp: String(nowUnix),
          signature: "v1,invalid",
        },
        webhookSecret: secret,
        nowUnixSeconds: nowUnix,
      }),
    ).toThrow();
  });
});
