import "server-only";

import { Resend, type WebhookEventPayload } from "resend";
import { getServerEnv } from "@/server/env";
import { redactStringSecrets } from "@/server/security/redact";

export interface EmailSendResult {
  sent: boolean;
  reason?: "not_configured" | "provider_error";
  id?: string;
}

export interface EmailService {
  isConfigured(): boolean;
  sendSecurityLockoutAlert(params: {
    to: string;
    locale: "fr" | "en";
    lockedMinutes: number;
  }): Promise<EmailSendResult>;
}

const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

export function createResendEmailService(): EmailService {
  const env = getServerEnv();
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      isConfigured: () => false,
      async sendSecurityLockoutAlert() {
        return { sent: false, reason: "not_configured" };
      },
    };
  }

  const resend = new Resend(apiKey);

  return {
    isConfigured: () => true,
    async sendSecurityLockoutAlert({ to, locale, lockedMinutes }) {
      const subject =
        locale === "en"
          ? "BONUVO Security Alert: temporary login lock"
          : "Alerte sécurité BONUVO : blocage temporaire de connexion";

      const html =
        locale === "en"
          ? `<p>Several failed sign-in attempts were detected on your BONUVO account.</p><p>As a precaution, logins for this account are blocked for ${lockedMinutes} minutes. If this was not you, reset your password.</p>`
          : `<p>Plusieurs tentatives de connexion infructueuses ont été détectées sur votre compte BONUVO.</p><p>Par précaution, l'accès à ce compte est bloqué pendant ${lockedMinutes} minutes. Si vous n'êtes pas à l'origine de ces tentatives, réinitialisez votre mot de passe.</p>`;

      try {
        const result = await resend.emails.send({
          from,
          to: [to],
          subject,
          html,
        });
        if (result.error) {
          console.error(
            `[email] Échec Resend alerte sécurité : ${redactStringSecrets(result.error.message)}`,
          );
          return { sent: false, reason: "provider_error" };
        }
        return { sent: true, id: result.data?.id };
      } catch (error) {
        const msg = error instanceof Error ? redactStringSecrets(error.message) : "erreur inconnue";
        console.error(`[email] Exception Resend alerte sécurité : ${msg}`);
        return { sent: false, reason: "provider_error" };
      }
    },
  };
}

export interface WebhookVerifyInput {
  payload: string;
  headers: {
    id: string;
    timestamp: string;
    signature: string;
  };
  webhookSecret: string;
  nowUnixSeconds?: number;
  maxAgeSeconds?: number;
}

/**
 * Verifies Resend webhook HMAC signature (Svix) and enforces a strict 5-minute replay window.
 */
export function verifyResendWebhook(input: WebhookVerifyInput): WebhookEventPayload {
  const maxAge = input.maxAgeSeconds ?? DEFAULT_WEBHOOK_TOLERANCE_SECONDS;
  const nowSeconds = input.nowUnixSeconds ?? Math.floor(Date.now() / 1000);
  const parsedTs = Number.parseInt(input.headers.timestamp, 10);

  if (!Number.isFinite(parsedTs) || Math.abs(nowSeconds - parsedTs) > maxAge) {
    throw new Error("Horodatage webhook hors fenêtre autorisée.");
  }

  const resend = new Resend("re_webhook_verify_only");
  return resend.webhooks.verify({
    payload: input.payload,
    headers: input.headers,
    webhookSecret: input.webhookSecret,
  });
}
