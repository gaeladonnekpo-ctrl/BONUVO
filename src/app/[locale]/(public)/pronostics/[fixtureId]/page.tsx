import { ArrowLeft, CalendarClock, Lock, MapPin, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { HeadToHead } from "@/components/ai/HeadToHead";
import { ProbabilityBar } from "@/components/ai/ProbabilityBar";
import { LeagueBadge, TeamCrest } from "@/components/ai/SportCrest";
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
        ? "Detailed BONUVO AI probability breakdown, key players, recent form and H2H."
        : "Distribution de probabilités BONUVO AI, joueurs clés, forme récente et H2H.",
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
  const primary =
    fixture.predictions.find((p) => p.market === "1x2") ?? fixture.predictions[0] ?? null;

  const dc1X = primary
    ? Math.round(((primary.probabilities.home ?? 0) + (primary.probabilities.draw ?? 0)) * 100)
    : null;
  const dc12 = primary
    ? Math.round(((primary.probabilities.home ?? 0) + (primary.probabilities.away ?? 0)) * 100)
    : null;
  const dcX2 = primary
    ? Math.round(((primary.probabilities.draw ?? 0) + (primary.probabilities.away ?? 0)) * 100)
    : null;

  return (
    <div className="space-y-8 py-3 sm:py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/pronostics">
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {isEn ? "Back to forecasts" : "Retour aux pronostics"}
          </Link>
        </Button>
        <LeagueBadge
          name={fixture.leagueName}
          logoUrl={fixture.leagueLogo}
          countryName={fixture.countryName}
        />
      </div>

      {/* Immersive Mobile-First Stadium Matchup Header */}
      <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface-subtle to-accent/10 p-5 sm:p-7">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
            <TeamCrest name={fixture.homeTeamName} logoUrl={fixture.homeTeamLogo} size="lg" />
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                {isEn ? "Home" : "Domicile"}
              </span>
              <h1 className="font-display text-base font-extrabold text-fg sm:text-2xl">
                {fixture.homeTeamName}
              </h1>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center text-center">
            <span className="rounded-2xl border border-accent/40 bg-accent/10 px-3 py-1.5 font-display text-sm font-black text-accent sm:text-base">
              VS
            </span>
            {primary ? (
              <span className="mt-1.5 rounded-full bg-surface px-2.5 py-0.5 font-mono text-xs font-bold text-fg">
                xG {primary.expectedHomeGoals.toFixed(2)} - {primary.expectedAwayGoals.toFixed(2)}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col items-center gap-2 text-center sm:flex-row-reverse sm:text-right">
            <TeamCrest name={fixture.awayTeamName} logoUrl={fixture.awayTeamLogo} size="lg" />
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                {isEn ? "Away" : "Extérieur"}
              </span>
              <p className="font-display text-base font-extrabold text-fg sm:text-2xl">
                {fixture.awayTeamName}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 border-t border-border/70 pt-4 text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            {new Date(fixture.kickoffAt).toISOString().slice(0, 16).replace("T", " ")} UTC
          </span>
          {fixture.venueName ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              {fixture.venueName}
            </span>
          ) : null}
        </div>
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
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {fixture.predictions.map((pred) => (
                <Card key={pred.id} className="border-border/90">
                  <CardHeader className="space-y-2 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="inline-flex items-center gap-1.5 text-sm font-mono uppercase">
                        <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                        {pred.market}
                      </CardTitle>
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

            {dc1X !== null && dc12 !== null && dcX2 !== null ? (
              <Card className="border-border/80 bg-surface-subtle/60">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-accent">
                      {isEn ? "Double Chance Probabilities" : "Probabilités Double Chance"}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {isEn
                        ? "Derived from the normalized 1X2 distribution"
                        : "Calculées à partir de la distribution 1X2 normalisée"}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl border border-border bg-surface px-3 py-2">
                      <span className="block text-fg-muted">1X ({fixture.homeTeamName})</span>
                      <strong className="font-mono text-sm text-fg">{dc1X}%</strong>
                    </div>
                    <div className="rounded-xl border border-border bg-surface px-3 py-2">
                      <span className="block text-fg-muted">12</span>
                      <strong className="font-mono text-sm text-fg">{dc12}%</strong>
                    </div>
                    <div className="rounded-xl border border-border bg-surface px-3 py-2">
                      <span className="block text-fg-muted">X2 ({fixture.awayTeamName})</span>
                      <strong className="font-mono text-sm text-fg">{dcX2}%</strong>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
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
