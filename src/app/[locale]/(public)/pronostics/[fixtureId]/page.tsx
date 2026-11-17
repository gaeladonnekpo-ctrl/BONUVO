import { ArrowLeft, Lock } from "lucide-react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { HeadToHead } from "@/components/ai/HeadToHead";
import { ProbabilityBar } from "@/components/ai/ProbabilityBar";
import { StatsTable } from "@/components/ai/StatsTable";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import { getPublicFixtureDetail } from "@/modules/ai/service/public-ai-service";

export const dynamic = "force-dynamic";

const uuidSchema = z.string().uuid();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; fixtureId: string }>;
}) {
  const { locale, fixtureId } = await params;
  const resolvedLocale: AppLocale = locale === "en" ? "en" : "fr";
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    pathname: `/pronostics/${fixtureId}`,
    title:
      resolvedLocale === "en"
        ? "Match Statistical Forecast — BONUVO AI"
        : "Analyse Match — BONUVO AI",
    description:
      resolvedLocale === "en"
        ? "Detailed Poisson probability breakdown and season statistics."
        : "Distribution de probabilités Poisson et statistiques comparées du match.",
  });
}

export default async function PublicFixtureDetailPage({
  params,
}: {
  params: Promise<{ locale: string; fixtureId: string }>;
}) {
  const { locale, fixtureId } = await params;
  setRequestLocale(locale);
  const resolvedLocale: "fr" | "en" = locale === "en" ? "en" : "fr";
  const isEn = resolvedLocale === "en";

  if (!uuidSchema.safeParse(fixtureId).success) {
    notFound();
  }

  const detail = await getPublicFixtureDetail(fixtureId);
  if (!detail) {
    notFound();
  }

  const { fixture, homeStats, awayStats, headToHead } = detail;

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/pronostics">
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {isEn ? "Back to forecasts" : "Retour aux pronostics"}
          </Link>
        </Button>
        <UiBadge tone="outline">{fixture.leagueName}</UiBadge>
      </div>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-fg">
          {fixture.homeTeamName} vs {fixture.awayTeamName}
        </h1>
        <p className="text-sm text-fg-muted">
          {new Date(fixture.kickoffAt).toISOString().slice(0, 16).replace("T", " ")} UTC
          {fixture.venueName ? ` · ${fixture.venueName}` : ""}
        </p>
      </header>

      <section aria-labelledby="markets-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="markets-heading" className="font-display text-xl font-bold text-fg">
            {isEn ? "BONUVO AI Market Analysis" : "Analyses & Marchés BONUVO AI"}
          </h2>
          <UiBadge tone="accent">BONUVO AI</UiBadge>
        </div>

        {fixture.predictions.length === 0 ? (
          <Card>
            <CardContent className="pt-5 text-sm text-fg-muted">
              {isEn
                ? "No forecast published for this fixture (minimum 6 played matches per team required)."
                : "Aucun pronostic publié pour cette rencontre (seuil minimal de 6 matchs joués par équipe requis)."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {fixture.predictions.map((pred) => (
              <Card key={pred.id}>
                <CardHeader className="space-y-2 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-mono uppercase">{pred.market}</CardTitle>
                    <ConfidenceBadge
                      level={pred.confidenceLevel}
                      score={pred.confidenceScore}
                      locale={resolvedLocale}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ProbabilityBar
                    market={pred.market}
                    probabilities={pred.probabilities}
                    pickedSelection={pred.pickedSelection}
                    locale={resolvedLocale}
                  />
                  <p className="text-xs leading-relaxed text-fg-muted">{pred.analysisText}</p>
                  {pred.lockedAt ? (
                    <p className="inline-flex items-center gap-1 text-[11px] text-fg-muted">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      {isEn ? "Locked before kickoff" : "Verrouillé avant coup d'envoi"}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatsTable
          homeTeamName={fixture.homeTeamName}
          awayTeamName={fixture.awayTeamName}
          homeStats={homeStats}
          awayStats={awayStats}
          locale={resolvedLocale}
        />
        <HeadToHead items={headToHead} locale={resolvedLocale} />
      </div>
    </div>
  );
}
