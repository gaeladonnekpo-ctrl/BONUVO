import "server-only";

import { logSecurityEvent } from "@/server/audit/log";
import {
  createDefaultAuthDeps,
  type AuthActionResponse,
  type AuthServiceDeps,
} from "@/modules/auth/service";
import type { ResendVerificationInput, TotpVerifyInput } from "@/modules/auth/schema";
import { hashIdentifier, hashIp } from "@/server/security/ip";
import { sanitizeRelativeRedirect } from "@/server/security/redirect";

export async function signOutCurrentUser(
  locale: "fr" | "en",
  clientIp: string,
  deps?: AuthServiceDeps,
): Promise<AuthActionResponse> {
  const ctx = deps ?? (await createDefaultAuthDeps());
  if (!ctx.supabase || !ctx.ipHashSecret) {
    return {
      ok: true,
      status: 200,
      redirectTo: `/${locale}/connexion`,
      message: locale === "en" ? "Signed out." : "Déconnexion effectuée.",
    };
  }

  const { data } = await ctx.supabase.auth.getUser();
  await ctx.supabase.auth.signOut({ scope: "local" });
  if (data.user) {
    await logSecurityEvent({
      userId: data.user.id,
      eventType: "session_revoked",
      severity: "info",
      ipHash: hashIp(clientIp, ctx.ipHashSecret),
      route: "/api/auth/sign-out",
      details: { scope: "local" },
    });
  }

  return {
    ok: true,
    status: 200,
    redirectTo: `/${locale}/connexion`,
    message: locale === "en" ? "Signed out." : "Déconnexion effectuée.",
  };
}

export async function resendVerificationEmail(
  input: ResendVerificationInput,
  clientIp: string,
  deps: AuthServiceDeps,
): Promise<AuthActionResponse> {
  if (!deps.rateLimiter || !deps.supabase || !deps.ipHashSecret) {
    return {
      ok: false,
      status: 503,
      code: "SERVICE_NOT_CONFIGURED",
      message:
        input.locale === "en"
          ? "Verification service is not configured."
          : "Le service de vérification n'est pas configuré.",
    };
  }

  const ipHash = hashIp(clientIp, deps.ipHashSecret);
  const identifierHash = hashIdentifier(input.email, deps.ipHashSecret);
  if (!identifierHash || !ipHash) {
    return {
      ok: false,
      status: 503,
      code: "SERVICE_NOT_CONFIGURED",
      message: "Configuration incomplète.",
    };
  }

  const decision = await deps.rateLimiter.consume("resend_verification", identifierHash);
  if (!decision.allowed) {
    await logSecurityEvent({
      eventType: "resend_verification_rate_limited",
      severity: "warning",
      ipHash,
      identifierHash,
      route: "/api/auth/resend-verification",
      details: { retryAfterSeconds: decision.retryAfterSeconds },
    });
    return {
      ok: false,
      status: 429,
      code: "RATE_LIMITED",
      retryAfterSeconds: decision.retryAfterSeconds,
      message:
        input.locale === "en"
          ? "Too many verification requests. Please wait before retrying."
          : "Trop de demandes de renvoi. Veuillez patienter.",
    };
  }

  await deps.supabase.auth.resend({
    type: "signup",
    email: input.email,
    options: {
      emailRedirectTo: `${deps.siteUrl}/api/auth/callback?locale=${input.locale}&next=/${input.locale}/compte`,
    },
  });

  return {
    ok: true,
    status: 200,
    message:
      input.locale === "en"
        ? "If this account requires confirmation, a new verification link has been sent."
        : "Si ce compte nécessite une confirmation, un nouvel e-mail a été envoyé.",
  };
}

export async function enrollTotpFactor(
  locale: "fr" | "en",
  clientIp: string,
  deps?: AuthServiceDeps,
): Promise<AuthActionResponse<{ factorId: string; qrCode: string; secret: string }>> {
  const ctx = deps ?? (await createDefaultAuthDeps());
  if (!ctx.supabase || !ctx.ipHashSecret) {
    return {
      ok: false,
      status: 503,
      code: "SERVICE_NOT_CONFIGURED",
      message:
        locale === "en" ? "MFA service is not configured." : "Le service TOTP n'est pas configuré.",
    };
  }

  const { data: userData, error: userError } = await ctx.supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: locale === "en" ? "Sign in required." : "Connexion requise.",
    };
  }

  const { data, error } = await ctx.supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "BONUVO Authenticator",
  });

  if (error || !data) {
    return {
      ok: false,
      status: 400,
      code: "TOTP_ENROLL_FAILED",
      message:
        locale === "en"
          ? "Unable to start TOTP enrollment."
          : "Impossible d'initialiser l'enrôlement TOTP.",
    };
  }

  await logSecurityEvent({
    userId: userData.user.id,
    eventType: "totp_enrolled",
    severity: "info",
    ipHash: hashIp(clientIp, ctx.ipHashSecret),
    route: "/api/auth/mfa/enroll",
    details: { factorId: data.id },
  });

  return {
    ok: true,
    status: 200,
    message: locale === "en" ? "TOTP factor initialized." : "Facteur TOTP initialisé.",
    data: {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    },
  };
}

export async function verifyTotpChallenge(
  input: TotpVerifyInput,
  clientIp: string,
  deps?: AuthServiceDeps,
): Promise<AuthActionResponse> {
  const ctx = deps ?? (await createDefaultAuthDeps());
  if (!ctx.supabase || !ctx.rateLimiter || !ctx.ipHashSecret) {
    return {
      ok: false,
      status: 503,
      code: "SERVICE_NOT_CONFIGURED",
      message:
        input.locale === "en"
          ? "MFA or rate-limit service is not configured."
          : "Le service TOTP ou de limitation n'est pas configuré.",
    };
  }

  const { data: userData, error: userError } = await ctx.supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: input.locale === "en" ? "Sign in required." : "Connexion requise.",
    };
  }

  const ipHash = hashIp(clientIp, ctx.ipHashSecret);
  const lockTtl = await ctx.rateLimiter.checkLock("otp_account", userData.user.id);
  if (lockTtl > 0) {
    await ctx.supabase.auth.signOut({ scope: "local" });
    return {
      ok: false,
      status: 429,
      code: "OTP_LOCKED",
      retryAfterSeconds: lockTtl,
      redirectTo: `/${input.locale}/connexion`,
      message:
        input.locale === "en"
          ? "Too many invalid TOTP codes. Please sign in again later."
          : "Trop de codes TOTP invalides. Nouvelle connexion requise après blocage.",
    };
  }

  const challenge = await ctx.supabase.auth.mfa.challenge({ factorId: input.factorId });
  if (challenge.error || !challenge.data) {
    return {
      ok: false,
      status: 400,
      code: "TOTP_CHALLENGE_FAILED",
      message:
        input.locale === "en"
          ? "Unable to verify TOTP factor."
          : "Impossible de valider le code TOTP.",
    };
  }

  const verify = await ctx.supabase.auth.mfa.verify({
    factorId: input.factorId,
    challengeId: challenge.data.id,
    code: input.code,
  });

  if (verify.error) {
    const decision = await ctx.rateLimiter.consume("otp_account", userData.user.id);
    await logSecurityEvent({
      userId: userData.user.id,
      eventType: "totp_failed",
      severity: decision.allowed ? "warning" : "high",
      ipHash,
      route: "/api/auth/mfa/verify",
      details: { locked: !decision.allowed },
    });

    if (!decision.allowed) {
      await ctx.supabase.auth.signOut({ scope: "local" });
      return {
        ok: false,
        status: 429,
        code: "OTP_LOCKED",
        retryAfterSeconds: decision.retryAfterSeconds,
        redirectTo: `/${input.locale}/connexion`,
        message:
          input.locale === "en"
            ? "Too many invalid codes. Account temporarily locked; new sign-in required."
            : "Trop de codes invalides. Blocage 15 minutes, nouvelle connexion exigée.",
      };
    }

    return {
      ok: false,
      status: 401,
      code: "INVALID_TOTP_CODE",
      message: input.locale === "en" ? "Invalid TOTP code." : "Code TOTP invalide.",
    };
  }

  await logSecurityEvent({
    userId: userData.user.id,
    eventType: "totp_verified",
    severity: "info",
    ipHash,
    route: "/api/auth/mfa/verify",
    details: { factorId: input.factorId },
  });

  return {
    ok: true,
    status: 200,
    redirectTo: sanitizeRelativeRedirect(input.next, `/${input.locale}/admin`),
    message: input.locale === "en" ? "Two-factor verified." : "Double authentification validée.",
  };
}
