import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { logAudit, logSecurityEvent } from "@/server/audit/log";
import { loadOrBootstrapProfileContext } from "@/server/auth/session";
import { roleRequiresTotp } from "@/server/auth/rbac-catalog";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/server/auth/supabase";
import { createResendEmailService, type EmailService } from "@/server/email/mailer";
import { getServerEnv } from "@/server/env";
import { hashIdentifier, hashIp } from "@/server/security/ip";
import { createUpstashRateLimitBackend, type RateLimitBackend } from "@/server/security/rate-limit";
import { sanitizeRelativeRedirect } from "@/server/security/redirect";
import { findProfileForSecurityByEmail, recordConsentDecisions } from "@/modules/auth/repository";
import type { SignInInput, SignUpInput } from "@/modules/auth/schema";

export interface AuthActionResponse<T = undefined> {
  ok: boolean;
  status: number;
  message: string;
  code?: string;
  redirectTo?: string;
  retryAfterSeconds?: number;
  data?: T;
}

export interface AuthServiceDeps {
  supabase: SupabaseClient | null;
  adminSupabase: SupabaseClient | null;
  rateLimiter: RateLimitBackend | null;
  emailService: EmailService;
  siteUrl: string;
  ipHashSecret: string | null;
}

export async function createDefaultAuthDeps(): Promise<AuthServiceDeps> {
  const env = getServerEnv();
  return {
    supabase: await createSupabaseServerClient(),
    adminSupabase: createSupabaseAdminClient(),
    rateLimiter: createUpstashRateLimitBackend(),
    emailService: createResendEmailService(),
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    ipHashSecret: env.IP_HASH_SECRET ?? null,
  };
}

export function unavailableService<T = undefined>(locale: "fr" | "en"): AuthActionResponse<T> {
  return {
    ok: false,
    status: 503,
    code: "SERVICE_NOT_CONFIGURED",
    message:
      locale === "en"
        ? "Authentication or rate-limiting service is not configured in this environment."
        : "Le service d'authentification ou de limitation n'est pas configuré dans cet environnement.",
  };
}

export function rateLimitedResponse<T = undefined>(
  locale: "fr" | "en",
  retryAfterSeconds: number,
): AuthActionResponse<T> {
  return {
    ok: false,
    status: 429,
    code: "RATE_LIMITED",
    retryAfterSeconds,
    message:
      locale === "en"
        ? "Too many attempts. Please try again later."
        : "Trop de tentatives. Veuillez réessayer ultérieurement.",
  };
}

export async function signInWithRateLimit(
  input: SignInInput,
  clientIp: string,
  deps: AuthServiceDeps,
): Promise<AuthActionResponse<{ requiresTotp: boolean }>> {
  if (!deps.rateLimiter || !deps.supabase || !deps.ipHashSecret) {
    return unavailableService<{ requiresTotp: boolean }>(input.locale);
  }

  const ipHash = hashIp(clientIp, deps.ipHashSecret);
  const identifierHash = hashIdentifier(input.email, deps.ipHashSecret);
  if (!ipHash || !identifierHash) {
    return unavailableService<{ requiresTotp: boolean }>(input.locale);
  }

  const accountLockTtl = await deps.rateLimiter.checkLock("login_account", identifierHash);
  if (accountLockTtl > 0) {
    await logSecurityEvent({
      eventType: "login_rate_limited",
      severity: "high",
      ipHash,
      identifierHash,
      route: "/api/auth/sign-in",
      details: { rule: "login_account" },
    });
    return rateLimitedResponse<{ requiresTotp: boolean }>(input.locale, accountLockTtl);
  }

  const ipDecision = await deps.rateLimiter.consume("login_ip", ipHash);
  if (!ipDecision.allowed) {
    await logSecurityEvent({
      eventType: "login_rate_limited",
      severity: "high",
      ipHash,
      identifierHash,
      route: "/api/auth/sign-in",
      details: { rule: "login_ip", retryAfterSeconds: ipDecision.retryAfterSeconds },
    });
    return rateLimitedResponse<{ requiresTotp: boolean }>(
      input.locale,
      ipDecision.retryAfterSeconds,
    );
  }

  const { data, error } = await deps.supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    const accountDecision = await deps.rateLimiter.consume("login_account", identifierHash);
    const target = await findProfileForSecurityByEmail(input.email).catch(() => null);
    await logSecurityEvent({
      userId: target?.id ?? null,
      eventType: "login_failed",
      severity: accountDecision.allowed ? "warning" : "critical",
      ipHash,
      identifierHash,
      route: "/api/auth/sign-in",
      details: { locked: !accountDecision.allowed },
    });

    if (!accountDecision.allowed && accountDecision.newlyLocked && target) {
      await deps.emailService.sendSecurityLockoutAlert({
        to: target.email,
        locale: target.locale === "en" ? "en" : "fr",
        lockedMinutes: Math.ceil(accountDecision.retryAfterSeconds / 60),
      });
    }

    return {
      ok: false,
      status: accountDecision.allowed ? 401 : 429,
      code: accountDecision.allowed ? "INVALID_CREDENTIALS" : "RATE_LIMITED",
      retryAfterSeconds: accountDecision.allowed ? undefined : accountDecision.retryAfterSeconds,
      message: input.locale === "en" ? "Invalid credentials." : "Identifiants invalides.",
    };
  }

  const profileCtx = await loadOrBootstrapProfileContext({
    userId: data.user.id,
    email: data.user.email ?? input.email,
    emailVerifiedAt: data.user.email_confirmed_at ? new Date(data.user.email_confirmed_at) : null,
  });

  await logSecurityEvent({
    userId: data.user.id,
    eventType: "login_success",
    severity: "info",
    ipHash,
    identifierHash,
    route: "/api/auth/sign-in",
    details: { aal: data.session ? "aal1" : "none" },
  });

  const needsTotp = roleRequiresTotp(profileCtx.roles);
  const safeNext = sanitizeRelativeRedirect(input.next, `/${input.locale}/compte`);
  const destination = !profileCtx.emailVerified
    ? `/${input.locale}/verification`
    : needsTotp
      ? `/${input.locale}/double-authentification?next=${encodeURIComponent(safeNext)}`
      : safeNext;

  return {
    ok: true,
    status: 200,
    redirectTo: destination,
    data: { requiresTotp: needsTotp },
    message: input.locale === "en" ? "Signed in." : "Connexion réussie.",
  };
}

export async function signUpWithRateLimit(
  input: SignUpInput,
  clientIp: string,
  deps: AuthServiceDeps,
): Promise<AuthActionResponse> {
  if (!deps.rateLimiter || !deps.supabase || !deps.ipHashSecret) {
    return unavailableService(input.locale);
  }

  const ipHash = hashIp(clientIp, deps.ipHashSecret);
  if (!ipHash) return unavailableService(input.locale);

  const ipDecision = await deps.rateLimiter.consume("signup_ip", ipHash);
  if (!ipDecision.allowed) {
    await logSecurityEvent({
      eventType: "signup_rate_limited",
      severity: "warning",
      ipHash,
      route: "/api/auth/sign-up",
      details: { retryAfterSeconds: ipDecision.retryAfterSeconds },
    });
    return rateLimitedResponse(input.locale, ipDecision.retryAfterSeconds);
  }

  const redirectTo = `${deps.siteUrl}/api/auth/callback?locale=${input.locale}&next=/${input.locale}/compte`;
  const { data, error } = await deps.supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: redirectTo,
      data: { display_name: input.displayName, locale: input.locale, country: input.countryCode },
    },
  });

  if (data.user && !error) {
    await loadOrBootstrapProfileContext({
      userId: data.user.id,
      email: input.email,
      displayName: input.displayName,
      emailVerifiedAt: data.user.email_confirmed_at ? new Date(data.user.email_confirmed_at) : null,
    });
    await recordConsentDecisions({
      userId: data.user.id,
      ipHash,
      policyVersion: "2026-11-phase-2",
      decisions: [
        { type: "analytics", granted: input.acceptAnalytics },
        { type: "notifications", granted: input.acceptNotifications },
        { type: "marketing_email", granted: input.acceptMarketing },
      ],
    });
    await logAudit({
      actorId: data.user.id,
      action: "user.registered",
      entityType: "profiles",
      entityId: data.user.id,
      beforeState: null,
      afterState: { locale: input.locale, countryCode: input.countryCode },
      ipHash,
    });
  }

  return {
    ok: true,
    status: 200,
    redirectTo: `/${input.locale}/verification`,
    message:
      input.locale === "en"
        ? "If this address is eligible, a verification e-mail has been sent."
        : "Si cette adresse est recevable, un e-mail de vérification vient d'être envoyé.",
  };
}
