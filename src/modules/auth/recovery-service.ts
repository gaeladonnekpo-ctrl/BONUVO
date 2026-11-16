import "server-only";

import { createHash } from "node:crypto";
import { logSecurityEvent } from "@/server/audit/log";
import { hashIdentifier, hashIp } from "@/server/security/ip";
import type { ForgotPasswordInput, ResetPasswordInput } from "@/modules/auth/schema";
import {
  rateLimitedResponse,
  unavailableService,
  type AuthActionResponse,
  type AuthServiceDeps,
} from "@/modules/auth/service";

export async function requestPasswordResetNeutral(
  input: ForgotPasswordInput,
  clientIp: string,
  deps: AuthServiceDeps,
): Promise<AuthActionResponse> {
  if (!deps.rateLimiter || !deps.supabase || !deps.ipHashSecret) {
    return unavailableService(input.locale);
  }

  const ipHash = hashIp(clientIp, deps.ipHashSecret);
  const identifierHash = hashIdentifier(input.email, deps.ipHashSecret);
  if (!ipHash || !identifierHash) return unavailableService(input.locale);

  const decision = await deps.rateLimiter.consume("forgot_password", `${ipHash}:${identifierHash}`);
  if (decision.allowed) {
    const redirectTo = `${deps.siteUrl}/api/auth/callback?locale=${input.locale}&type=recovery&next=/${input.locale}/reinitialisation`;
    await deps.supabase.auth.resetPasswordForEmail(input.email, { redirectTo });
    await logSecurityEvent({
      eventType: "password_reset_requested",
      severity: "info",
      ipHash,
      identifierHash,
      route: "/api/auth/forgot-password",
      details: { sent: true },
    });
  } else {
    await logSecurityEvent({
      eventType: "password_reset_requested",
      severity: "warning",
      ipHash,
      identifierHash,
      route: "/api/auth/forgot-password",
      details: { sent: false, reason: "rate_limited" },
    });
  }

  // Control A4 / section 11: strictly neutral response even when throttled or unknown address.
  return {
    ok: true,
    status: 200,
    message:
      input.locale === "en"
        ? "If an account matches this address, reset instructions have been sent."
        : "Si un compte correspond à cette adresse, un lien de réinitialisation vient d'être envoyé.",
  };
}

export async function completePasswordReset(
  input: ResetPasswordInput,
  clientIp: string,
  deps: AuthServiceDeps,
): Promise<AuthActionResponse> {
  if (!deps.rateLimiter || !deps.supabase || !deps.ipHashSecret) {
    return unavailableService(input.locale);
  }

  const ipHash = hashIp(clientIp, deps.ipHashSecret);
  if (!ipHash) return unavailableService(input.locale);

  const { data: userData, error: userError } = await deps.supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      status: 401,
      code: "INVALID_OR_EXPIRED_TOKEN",
      message:
        input.locale === "en"
          ? "This reset session is invalid or has expired."
          : "Ce lien de réinitialisation est invalide ou expiré.",
    };
  }

  const { data: sessionData } = await deps.supabase.auth.getSession();
  const tokenMaterial = sessionData.session?.access_token ?? userData.user.id;

  const tokenHash = createHash("sha256").update(tokenMaterial).digest("hex");
  const rateDecision = await deps.rateLimiter.consume("reset_password", `${ipHash}:${tokenHash}`);
  if (!rateDecision.allowed) {
    await deps.rateLimiter.markKeyInvalidated(tokenHash, 3600);
    await deps.supabase.auth.signOut({ scope: "global" });
    return rateLimitedResponse(input.locale, rateDecision.retryAfterSeconds);
  }

  const isInvalidated = await deps.rateLimiter.isKeyInvalidated(tokenHash);
  const firstUse = !isInvalidated && (await deps.rateLimiter.consumeOneTimeKey(tokenHash, 3600));
  if (!firstUse) {
    await deps.supabase.auth.signOut({ scope: "global" });
    return {
      ok: false,
      status: 400,
      code: "TOKEN_ALREADY_USED",
      message:
        input.locale === "en"
          ? "This reset link has already been used."
          : "Ce lien de réinitialisation a déjà été utilisé.",
    };
  }

  const { error: updateError } = await deps.supabase.auth.updateUser({
    password: input.password,
  });
  if (updateError) {
    return {
      ok: false,
      status: 400,
      code: "PASSWORD_UPDATE_FAILED",
      message:
        input.locale === "en"
          ? "Unable to update password. Ensure it meets the security policy."
          : "Impossible de mettre à jour le mot de passe.",
    };
  }

  // Control A8: invalidate all sessions on password change.
  await deps.supabase.auth.signOut({ scope: "global" });
  if (deps.adminSupabase && sessionData.session?.access_token) {
    await deps.adminSupabase.auth.admin.signOut(sessionData.session.access_token, "global");
  }

  await logSecurityEvent({
    userId: userData.user.id,
    eventType: "password_reset_completed",
    severity: "info",
    ipHash,
    route: "/api/auth/reset-password",
    details: { sessionsRevoked: "global" },
  });

  return {
    ok: true,
    status: 200,
    redirectTo: `/${input.locale}/connexion`,
    message:
      input.locale === "en"
        ? "Password updated. All active sessions have been signed out."
        : "Mot de passe mis à jour. Toutes vos sessions actives ont été déconnectées.",
  };
}
