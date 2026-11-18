import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { BrandLogo } from "@/components/brand/BrandLogo";

export const metadata: Metadata = {
  title: "Maintenance en cours — BONUVO",
  robots: { index: false, follow: false },
};

export default async function MaintenancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isEn = locale === "en";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-12 text-center text-fg">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-surface p-8 shadow-[var(--shadow-card)]">
        <div className="flex justify-center">
          <BrandLogo size="md" />
        </div>

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Wrench className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-fg">
            {isEn ? "Scheduled maintenance in progress" : "Maintenance technique en cours"}
          </h1>
          <p className="text-sm leading-relaxed text-fg-muted">
            {isEn
              ? "BONUVO is currently performing a brief scheduled update to keep offers, predictions, and services fast and reliable. We will be right back."
              : "BONUVO effectue actuellement une courte mise à jour pour garantir la fiabilité et la rapidité de la plateforme. Nous revenons dans quelques instants."}
          </p>
        </div>

        <a
          href={`/${locale}`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
        >
          {isEn ? "Try again" : "Réessayer"}
        </a>
      </div>
    </main>
  );
}
