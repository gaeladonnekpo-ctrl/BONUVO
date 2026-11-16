import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleValidatedAuthPost } from "@/modules/auth/http";
import { signInSchema } from "@/modules/auth/schema";
import { signInWithRateLimit, type AuthServiceDeps } from "@/modules/auth/service";
import { resetServerEnvCache } from "@/server/env";
import { createTestRateLimitBackend } from "@/server/security/rate-limit";

const logSecurityEventSpy = vi.fn().mockResolvedValue(undefined);
vi.mock("@/server/audit/log", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
  logSecurityEvent: (...args: unknown[]) => logSecurityEventSpy(...args),
}));

describe("Phase 2 — Auth HTTP route validation, CSRF & 429", () => {
  beforeEach(() => {
    resetServerEnvCache();
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@127.0.0.1:5432/bonuvo_test");
    vi.stubEnv("DATABASE_SSL", "require");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("IP_HASH_SECRET", "0123456789abcdef0123456789abcdef");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetServerEnvCache();
  });
  it("bloque CSRF cross-origin (403), corps > 16 Ko (413) et renvoie 429 + Retry-After à la 6e tentative", async () => {
    logSecurityEventSpy.mockClear();
    const rateLimiter = createTestRateLimitBackend();
    const deps: AuthServiceDeps = {
      supabase: {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: "Invalid credentials" },
          }),
        },
      } as unknown as SupabaseClient,
      adminSupabase: null,
      rateLimiter,
      emailService: {
        isConfigured: () => true,
        sendSecurityLockoutAlert: vi.fn().mockResolvedValue({ sent: true }),
      },
      siteUrl: "http://localhost:3000",
      ipHashSecret: "0123456789abcdef0123456789abcdef",
    };

    const csrfReq = new NextRequest("http://localhost:3000/api/auth/sign-in", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "https://evil.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "test@example.com",
        password: "WrongPassword123",
        locale: "fr",
      }),
    });
    const csrfRes = await handleValidatedAuthPost(
      csrfReq,
      signInSchema,
      "/api/auth/sign-in",
      signInWithRateLimit,
      deps,
    );
    expect(csrfRes.status).toBe(403);
    expect(logSecurityEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "csrf_rejected" }),
    );

    const largeReq = new NextRequest("http://localhost:3000/api/auth/sign-in", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "test@example.com",
        password: "x".repeat(20 * 1024),
        locale: "fr",
      }),
    });
    const largeRes = await handleValidatedAuthPost(
      largeReq,
      signInSchema,
      "/api/auth/sign-in",
      signInWithRateLimit,
      deps,
    );
    expect(largeRes.status).toBe(413);

    for (let i = 1; i <= 5; i++) {
      const req = new NextRequest("http://localhost:3000/api/auth/sign-in", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
          "x-vercel-forwarded-for": "203.0.113.200",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "WrongPassword123",
          locale: "fr",
        }),
      });
      const res = await handleValidatedAuthPost(
        req,
        signInSchema,
        "/api/auth/sign-in",
        signInWithRateLimit,
        deps,
      );
      expect(res.status).toBe(401);
    }

    const sixthReq = new NextRequest("http://localhost:3000/api/auth/sign-in", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
        "x-vercel-forwarded-for": "203.0.113.200",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "test@example.com",
        password: "WrongPassword123",
        locale: "fr",
      }),
    });
    const sixthRes = await handleValidatedAuthPost(
      sixthReq,
      signInSchema,
      "/api/auth/sign-in",
      signInWithRateLimit,
      deps,
    );
    expect(sixthRes.status).toBe(429);
    expect(sixthRes.headers.get("Retry-After")).toBe("900");
    expect(logSecurityEventSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ eventType: "login_rate_limited" }),
    );
  });
});
