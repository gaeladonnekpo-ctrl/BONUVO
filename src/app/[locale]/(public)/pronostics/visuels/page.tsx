import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { MatchPosterStudio } from "@/components/ai/MatchPosterStudio";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import {
  formatUtcDateIso,
  syncAndQueryFixturesByDate,
} from "@/modules/ai/service/date-sync-service";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = locale === "en" ? "en" : "fr";
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    pathname: "/pronostics/visuels",
    title:
      resolvedLocale === "en"
        ? "BONUVO Match Posters Generator"
        : "Visuels des matchs par compétition — BONUVO",
    description:
      resolvedLocale === "en"
        ? "Generate and download branded BONUVO matchday posters by league in PNG, JPG, WebP and PDF."
        : "Générez et téléchargez les affiches officielles BONUVO des matchs par compétition en PNG, JPG, WebP et PDF.",
  });
}

export default async function MatchPostersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const resolvedLocale: "fr" | "en" = locale === "en" ? "en" : "fr";
  const isEn = resolvedLocale === "en";

  const rawDate = typeof sp.date === "string" ? sp.date : undefined;
  const initialDateIso =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : formatUtcDateIso(new Date(), 60);
  const initialLeagueId = typeof sp.ligue === "string" ? sp.ligue : undefined;

  const fixturesData = await syncAndQueryFixturesByDate({
    dateIso: initialDateIso,
    tzOffsetMinutes: 60,
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.bonuvofr.com";

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/pronostics?date=${initialDateIso}`}>
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {isEn ? "Back to Forecasts" : "Retour aux Pronostics"}
          </Link>
        </Button>
        <UiBadge tone="accent" className="gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {isEn ? "Match Posters Studio" : "Visuels des matchs"}
        </UiBadge>
      </div>

      <header className="space-y-2">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
          {isEn ? "Matchday Posters by Competition" : "Visuels des matchs par compétition"}
        </h1>
        <p className="max-w-3xl text-sm text-fg-muted">
          {isEn
            ? "Select a date and a competition to automatically assemble all official fixtures onto a single BONUVO-branded visual, ready to download in PNG, JPG, WebP or PDF."
            : "Sélectionnez une date et une compétition pour regrouper automatiquement toutes les rencontres officielles sur une seule affiche BONUVO, prête à télécharger en PNG, JPG, WebP ou PDF."}
        </p>
      </header>

      <MatchPosterStudio
        initialDateIso={initialDateIso}
        initialFixtures={fixturesData.fixtures}
        initialLeagues={fixturesData.leagues}
        initialLeagueId={initialLeagueId}
        locale={resolvedLocale}
        siteUrl={siteUrl}
      />
    </div>
  );
}
