"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AuthForm, type AuthFormStatus } from "@/components/auth/AuthForm";
import { OtpInput } from "@/components/auth/OtpInput";
import { postAuthJson } from "@/components/auth/auth-client";
import { Button } from "@/components/ui/button";
import { totpVerifySchema } from "@/modules/auth/schema";

export function TotpForm({
  initialFactorId,
  nextPath,
}: {
  initialFactorId: string | null;
  nextPath?: string;
}) {
  const locale = useLocale() === "en" ? "en" : "fr";
  const router = useRouter();
  const t = useTranslations("auth.totp");

  const [factorId, setFactorId] = React.useState<string | null>(initialFactorId);
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [manualSecret, setManualSecret] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [enrolling, setEnrolling] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<AuthFormStatus | null>(null);

  async function handleEnroll() {
    setStatus(null);
    setEnrolling(true);
    try {
      const result = await postAuthJson<{ factorId: string; qrCode: string; secret: string }>(
        "/api/auth/mfa/enroll",
        { locale },
        locale === "en" ? "Unable to initialize TOTP." : "Impossible d'initialiser le TOTP.",
      );
      if (!result.ok || !result.data) {
        setStatus({ kind: "error", message: result.message });
        return;
      }
      setFactorId(result.data.factorId);
      setQrCode(
        result.data.qrCode.startsWith("data:")
          ? result.data.qrCode
          : `data:image/svg+xml;utf-8,${encodeURIComponent(result.data.qrCode)}`,
      );
      setManualSecret(result.data.secret);
    } finally {
      setEnrolling(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const parsed = totpVerifySchema.safeParse({
      factorId: factorId ?? "",
      code,
      locale,
      next: nextPath,
    });
    if (!parsed.success) {
      setStatus({
        kind: "error",
        message: parsed.error.issues[0]?.message ?? "Code TOTP invalide.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await postAuthJson(
        "/api/auth/mfa/verify",
        parsed.data,
        locale === "en" ? "TOTP verification failed." : "Échec de vérification TOTP.",
      );
      if (!result.ok) {
        setStatus({ kind: "error", message: result.message });
        if (result.redirectTo) {
          router.push(result.redirectTo);
        }
        return;
      }
      router.push(result.redirectTo ?? `/${locale}/admin`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthForm
      title={t("title")}
      description={t("description")}
      status={status}
      onSubmit={handleSubmit}
    >
      {!factorId ? (
        <div className="space-y-3 rounded-lg border border-border bg-surface-subtle p-4 text-sm text-fg-muted">
          <p>{t("noFactor")}</p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleEnroll}
            disabled={enrolling}
          >
            {enrolling ? t("enrolling") : t("enrollButton")}
          </Button>
        </div>
      ) : null}

      {qrCode ? (
        <div className="space-y-3 rounded-lg border border-border bg-surface-subtle p-4 text-center">
          <Image
            src={qrCode}
            alt={t("qrAlt")}
            width={176}
            height={176}
            unoptimized
            className="mx-auto rounded-lg bg-white p-2"
          />
          {manualSecret ? (
            <p className="font-mono text-xs break-all text-fg-muted">
              <strong className="text-fg">{t("secretLabel")}</strong> {manualSecret}
            </p>
          ) : null}
        </div>
      ) : null}

      <OtpInput value={code} onChange={setCode} disabled={!factorId || submitting} />

      <Button type="submit" className="w-full" disabled={!factorId || submitting}>
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </AuthForm>
  );
}
