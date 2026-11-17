import { BarChart2, CalendarRange } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { CouponsSection } from "@/components/ai/CouponsSection";
import { FixtureRow } from "@/components/ai/FixtureRow";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import {
  PLATFORM_GAMING_GUIDES,
  buildCombinedCoupons,
  buildSinglePicks,
} from "@/modules/ai/model/coupons";
import {
  getPublicPredictionStats,
  listPublicFixtures,
} from "@/modules/ai/service/public-ai-service";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = locale === "en" ? "en" : "fr";
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    pathname: "/pronostics",
    title:
      resolvedLocale === "en" ? "BONUVO AI Football Predictions" : "Pronostics Football BONUVO AI",
    description:
      resolvedLocale === "en"
        ? "Probabilistic football forecasts computed via deterministic Poisson v1.0 model."
        : "Estimations probabilistes football calculées par le modèle Poisson v1.0.",
  });
}

export default async function PublicPredictionsPage({
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
  const leagueFilter = typeof sp.ligue === "string" ? sp.ligue : undefined;

  const [fixturesData, statsData] = await Promise.all([
    listPublicFixtures({ leagueId: leagueFilter, upcomingOnly: true, limit: 30 }),
    getPublicPredictionStats(),
  ]);

  const singles = buildSinglePicks(fixturesData.fixtures);
  const coupons = buildCombinedCoupons(fixturesData.fixtures);

  return (
    <div className="space-y-8 py-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <UiBadge tone="accent">BONUVO AI</UiBadge>
            <UiBadge tone="outline">1X2 · +2.5 · BTTS · Combinés</UiBadge>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-fg">
            {isEn ? "BONUVO AI Sports Forecasts" : "Pronostics Sportifs BONUVO AI"}
          </h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            {isEn
              ? "Real-time statistical probabilities and combined coupons locked strictly before kickoff — without guaranteed winnings."
              : "Estimations probabilistes en temps réel, analyses détaillées et coupons combinés verrouillés avant le coup d'envoi — sans garantie de gain."}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/pronostics/historique">
            <BarChart2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {isEn ? "Accuracy & History" : "Historique & Précision"}
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-fg-muted">
              {isEn ? "Upcoming fixtures" : "Matchs analysables"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-fg">
              {fixturesData.fixtures.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-fg-muted">
              {isEn ? "Settled hit rate" : "Taux de réussite réglé"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-trust">
              {statsData.overall.winRatePct !== null ? `${statsData.overall.winRatePct}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-fg-muted">
              {isEn ? "Avg Brier score" : "Score de Brier moyen"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-fg">
              {statsData.overall.avgBrierScore !== null
                ? statsData.overall.avgBrierScore.toFixed(4)
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {fixturesData.leagues.length > 0 ? (
        <nav
          aria-label={isEn ? "Filter by league" : "Filtrer par compétition"}
          className="flex flex-wrap items-center gap-2"
        >
          <Button asChild size="sm" variant={!leagueFilter ? "primary" : "outline"}>
            <Link href="/pronostics">{isEn ? "All leagues" : "Toutes les ligues"}</Link>
          </Button>
          {fixturesData.leagues.map((l) => (
            <Button
              key={l.id}
              asChild
              size="sm"
              variant={leagueFilter === l.id ? "primary" : "outline"}
            >
              <Link href={`/pronostics?ligue=${l.id}`}>{l.name}</Link>
            </Button>
          ))}
        </nav>
      ) : null}

      {fixturesData.fixtures.length === 0 ? (
        <EmptyState
          icon={<CalendarRange className="h-6 w-6 text-fg-muted" />}
          title={
            isEn ? "No upcoming football forecasts available" : "Aucun pronostic à venir disponible"
          }
          description={
            isEn
              ? "BONUVO never fabricates match schedules or statistics. Upcoming predictions appear automatically after sports data ingestion runs."
              : "BONUVO n'invente jamais de matchs ni de statistiques. Les pronostics s'affichent automatiquement après synchronisation avec le fournisseur de données sportives."
          }
          action={
            <Button asChild variant="outline">
              <Link href="/pronostics/historique">
                {isEn ? "View settled history" : "Consulter l'historique"}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {fixturesData.fixtures.map((fix) => (
            <FixtureRow key={fix.id} fixture={fix} locale={resolvedLocale} />
          ))}
        </div>
      )}

      <CouponsSection
        coupons={coupons}
        singles={singles}
        guides={PLATFORM_GAMING_GUIDES}
        locale={resolvedLocale}
      />
    </div>
  );
}
