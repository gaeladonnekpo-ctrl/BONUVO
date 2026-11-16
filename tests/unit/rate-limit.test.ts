import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { signInWithRateLimit, type AuthServiceDeps } from "@/modules/auth/service";
import {
  completePasswordReset,
  requestPasswordResetNeutral,
} from "@/modules/auth/recovery-service";
import { verifyTotpChallenge } from "@/modules/auth/mfa-service";
import { createTestRateLimitBackend } from "@/server/security/rate-limit";

vi.mock("@/server/audit/log", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/auth/repository", () => ({
  findProfileForSecurityByEmail: vi.fn().mockResolvedValue({
    id: "33333333-3333-4333-8333-333333333333",
    email: "owner@example.com",
    locale: "fr",
  }),
  recordConsentDecisions: vi.fn().mockResolvedValue(undefined),
}));

function buildDeps(overrides?: Partial<AuthServiceDeps>): {
  deps: AuthServiceDeps;
  sendAlertMock: ReturnType<typeof vi.fn>;
  signOutMock: ReturnType<typeof vi.fn>;
  resetForEmailMock: ReturnType<typeof vi.fn>;
  updateUserMock: ReturnType<typeof vi.fn>;
} {
  let clock = 1_760_000_000_000;
  const sendAlertMock = vi.fn().mockResolvedValue({ sent: true, id: "mail_1" });
  const signOutMock = vi.fn().mockResolvedValue({ error: null });
  const resetForEmailMock = vi.fn().mockResolvedValue({ error: null });
  const updateUserMock = vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

  const stubSupabase = {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      }),
      signOut: signOutMock,
      resetPasswordForEmail: resetForEmailMock,
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "11111111-1111-4111-8111-111111111111", email: "user@example.com" } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "reset-access-token-123" } },
        error: null,
      }),
      updateUser: updateUserMock,
      mfa: {
        challenge: vi.fn().mockResolvedValue({ data: { id: "chal-1" }, error: null }),
        verify: vi.fn().mockResolvedValue({ data: null, error: { message: "Invalid TOTP" } }),
      },
    },
  } as unknown as SupabaseClient;

  const deps: AuthServiceDeps = {
    supabase: stubSupabase,
    adminSupabase: {
      auth: { admin: { signOut: vi.fn().mockResolvedValue({ error: null }) } },
    } as unknown as SupabaseClient,
    rateLimiter: createTestRateLimitBackend(() => clock),
    emailService: {
      isConfigured: () => true,
      sendSecurityLockoutAlert: sendAlertMock,
    },
    siteUrl: "https://bonuvo.example",
    ipHashSecret: "0123456789abcdef0123456789abcdef",
    ...overrides,
  };

  clock += 1;
  return { deps, sendAlertMock, signOutMock, resetForEmailMock, updateUserMock };
}

describe("Phase 2 — Rate limiting & token single-use", () => {
  it("bloque à la 6e tentative de connexion en 1 minute depuis la même IP (HTTP 429)", async () => {
    const { deps } = buildDeps();

    for (let attempt = 1; attempt <= 5; attempt++) {
      const res = await signInWithRateLimit(
        { email: "test@example.com", password: "WrongPassword123", locale: "fr" },
        "203.0.113.50",
        deps,
      );
      expect(res.status).toBe(401);
      expect(res.message).toBe("Identifiants invalides.");
    }

    const sixth = await signInWithRateLimit(
      { email: "test@example.com", password: "WrongPassword123", locale: "fr" },
      "203.0.113.50",
      deps,
    );
    expect(sixth.status).toBe(429);
    expect(sixth.code).toBe("RATE_LIMITED");
    expect(sixth.retryAfterSeconds).toBe(900);
  });

  it("bloque le compte 1 h après 10 échecs/heure via IP distinctes et envoie une alerte e-mail", async () => {
    const { deps, sendAlertMock } = buildDeps();

    for (let attempt = 1; attempt <= 10; attempt++) {
      const res = await signInWithRateLimit(
        { email: "owner@example.com", password: "WrongPassword123", locale: "fr" },
        `198.51.100.${attempt}`,
        deps,
      );
      expect(res.status).toBe(401);
    }

    const eleventh = await signInWithRateLimit(
      { email: "owner@example.com", password: "WrongPassword123", locale: "fr" },
      "198.51.100.99",
      deps,
    );
    expect(eleventh.status).toBe(429);
    expect(eleventh.retryAfterSeconds).toBe(3600);
    expect(sendAlertMock).toHaveBeenCalledTimes(1);
    expect(sendAlertMock).toHaveBeenCalledWith({
      to: "owner@example.com",
      locale: "fr",
      lockedMinutes: 60,
    });
  });

  it("renvoie une réponse neutre sans e-mail supplémentaire après 3 demandes de mot de passe oublié", async () => {
    const { deps, resetForEmailMock } = buildDeps();

    for (let i = 1; i <= 5; i++) {
      const res = await requestPasswordResetNeutral(
        { email: "unknown@example.com", locale: "fr" },
        "203.0.113.70",
        deps,
      );
      expect(res.status).toBe(200);
      expect(res.message).toContain("Si un compte correspond");
    }

    expect(resetForEmailMock).toHaveBeenCalledTimes(3);
  });

  it("n'autorise qu'un seul usage du jeton de réinitialisation et révoque toutes les sessions", async () => {
    const { deps, signOutMock, updateUserMock } = buildDeps();

    const first = await completePasswordReset(
      { password: "NewStrongPassword99", locale: "fr" },
      "203.0.113.80",
      deps,
    );
    expect(first.status).toBe(200);
    expect(updateUserMock).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledWith({ scope: "global" });

    const replay = await completePasswordReset(
      { password: "AnotherStrongPassword99", locale: "fr" },
      "203.0.113.80",
      deps,
    );
    expect(replay.status).toBe(400);
    expect(replay.code).toBe("TOKEN_ALREADY_USED");
    expect(updateUserMock).toHaveBeenCalledTimes(1);
  });

  it("bloque le compte après 5 codes TOTP invalides en 10 min et exige une nouvelle connexion", async () => {
    const { deps, signOutMock } = buildDeps();

    for (let i = 1; i <= 5; i++) {
      const res = await verifyTotpChallenge(
        {
          factorId: "22222222-2222-4222-8222-222222222222",
          code: "000000",
          locale: "fr",
        },
        "203.0.113.90",
        deps,
      );
      expect(res.status).toBe(401);
    }

    const sixth = await verifyTotpChallenge(
      {
        factorId: "22222222-2222-4222-8222-222222222222",
        code: "000000",
        locale: "fr",
      },
      "203.0.113.90",
      deps,
    );
    expect(sixth.status).toBe(429);
    expect(sixth.code).toBe("OTP_LOCKED");
    expect(sixth.redirectTo).toBe("/fr/connexion");
    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
  });

  it("retourne explicitement 503 SERVICE_NOT_CONFIGURED si Upstash ou Supabase manque en local", async () => {
    const { deps } = buildDeps({ rateLimiter: null });
    const res = await signInWithRateLimit(
      { email: "test@example.com", password: "ValidPassword123", locale: "fr" },
      "127.0.0.1",
      deps,
    );
    expect(res.status).toBe(503);
    expect(res.code).toBe("SERVICE_NOT_CONFIGURED");
  });
});
