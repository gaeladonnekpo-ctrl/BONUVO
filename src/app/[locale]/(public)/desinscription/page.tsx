import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MailX, ShieldAlert } from "lucide-react";
import { NewsletterEmailUnsubscribeForm } from "@/components/members/NewsletterEmailUnsubscribeForm";
import { processSignedUnsubscribe } from "@/modules/members/purge-service";
import { verifyUnsubscribeToken } from "@/modules/members/unsubscribe-token";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFr = locale === "fr";
  return {
    title: isFr ? "Désinscription en 1 clic — BONUVO" : "1-Click Unsubscribe — BONUVO",
    robots: { index: false, follow: false },
  };
}

export default async function PublicUnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ token?: string; confirm?: string }>;
}) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const isFr = locale === "fr";
  const token = (sp.token ?? "").trim();
  const autoConfirm = sp.confirm === "1";

  let status: "missing" | "invalid" | "ready" | "completed" = "missing";

  if (token) {
    if (autoConfirm) {
      const res = await processSignedUnsubscribe({ token });
      status = res.ok ? "completed" : "invalid";
    } else {
      const check = verifyUnsubscribeToken(token);
      status = check.valid ? "ready" : "invalid";
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-xs sm:p-8">
        <div className="flex items-center gap-2.5">
          {status === "completed" ? (
            <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
          ) : status === "invalid" ? (
            <ShieldAlert className="size-6 text-danger" aria-hidden="true" />
          ) : (
            <MailX className="size-6 text-accent" aria-hidden="true" />
          )}
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
            {isFr
              ? "Désinscription des communications BONUVO"
              : "Unsubscribe from BONUVO communications"}
          </h1>
        </div>

        {status === "completed" ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm leading-relaxed text-fg">
              {isFr
                ? "Votre désinscription a été enregistrée immédiatement sans besoin de vous connecter. Votre retrait de consentement a été horodaté dans notre registre."
                : "Your unsubscribe request has been processed immediately without requiring login. Your consent withdrawal has been timestamped."}
            </p>
            <Link
              href={`/${locale}`}
              className="inline-flex min-h-10 items-center rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-fg hover:bg-accent-hover"
            >
              {isFr ? "Retour à l'accueil" : "Back to home"}
            </Link>
          </div>
        ) : status === "ready" ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm leading-relaxed text-fg-muted">
              {isFr
                ? "Confirmez en un clic ci-dessous pour ne plus recevoir les communications e-mail de BONUVO."
                : "Confirm in one click below to stop receiving email communications from BONUVO."}
            </p>
            <Link
              href={`/${locale}/desinscription?token=${encodeURIComponent(token)}&confirm=1`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
            >
              {isFr ? "Confirmer ma désinscription en 1 clic" : "Confirm 1-click unsubscribe"}
            </Link>
          </div>
        ) : status === "invalid" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm leading-relaxed text-fg-muted">
              {isFr
                ? "Ce lien de désinscription est invalide ou a expiré."
                : "This unsubscribe link is invalid or has expired."}
            </p>
            <Link
              href={`/${locale}/compte`}
              className="inline-flex min-h-10 items-center rounded-xl border border-border bg-surface-muted px-4 py-2 text-xs font-semibold text-fg hover:bg-bg"
            >
              {isFr
                ? "Gérer mes préférences depuis mon compte"
                : "Manage preferences from my account"}
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm leading-relaxed text-fg-muted">
              {isFr
                ? "Saisissez votre adresse e-mail ci-dessous pour vous désabonner immédiatement de la newsletter BONUVO, ou gérez vos alertes depuis votre espace membre."
                : "Enter your email address below to immediately unsubscribe from the BONUVO newsletter, or manage alerts from your member account."}
            </p>
            <NewsletterEmailUnsubscribeForm locale={isFr ? "fr" : "en"} />
            <div className="pt-2">
              <Link
                href={`/${locale}/compte`}
                className="inline-flex min-h-10 items-center rounded-xl border border-border bg-surface-muted px-4 py-2 text-xs font-semibold text-fg hover:bg-bg"
              >
                {isFr ? "Accéder à mon espace membre" : "Go to member area"}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
