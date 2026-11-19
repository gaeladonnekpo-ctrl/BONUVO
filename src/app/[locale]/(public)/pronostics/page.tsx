import { Activity, BarChart2, Layers, ShieldCheck, Sparkles } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { AiResponsibilityNotice } from "@/components/ai/AiResponsibilityNotice";
import { CouponsSection } from "@/components/ai/CouponsSection";
import { FixturesExplorer } from "@/components/ai/FixturesExplorer";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
        ? "Real-time statistical football forecasts, club crests, player form and combined coupons by BONUVO AI."
        : "Pronostics football en temps réel, logos officiels, joueurs clés et coupons combinés par BONUVO AI.",
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
    listPublicFixtures({ upcomingOnly: true, limit: 40 }),
    getPublicPredictionStats(),
  ]);

  const allPredictions = fixturesData.fixtures.flatMap((f) => f.predictions);
  const avgConfidencePct =
    allPredictions.length > 0
      ? Math.round(
          (allPredictions.reduce((acc, p) => acc + p.confidenceScore, 0) / allPredictions.length) *
            100,
        )
      : null;

  const singles = buildSinglePicks(fixturesData.fixtures);
  const coupons = buildCombinedCoupons(fixturesData.fixtures);

  return (
    <div className="space-y-8 py-3 sm:py-5">
      {/* Immersive Mobile-First BONUVO AI Hero Header */}
      <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface-subtle to-accent/10 p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <UiBadge tone="accent" className="px-3 py-1 text-xs font-bold">
                BONUVO AI
              </UiBadge>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-trust/40 bg-trust-soft px-2.5 py-0.5 text-xs font-semibold text-trust">
                <span className="h-2 w-2 animate-pulse rounded-full bg-trust" />
                {isEn ? "Real-time sports intelligence" : "Intelligence sportive temps réel"}
              </span>
              <UiBadge tone="outline">1X2 · +2.5 · BTTS · Combinés</UiBadge>
            </div>

            <h1 className="font-display text-2xl font-extrabold tracking-tight text-fg sm:text-4xl">
              {isEn ? "BONUVO AI Sports Forecasts" : "Pronostics Sportifs BONUVO AI"}
            </h1>
            <p className="max-w-2xl text-xs leading-relaxed text-fg-muted sm:text-sm">
              {isEn
                ? "Live match schedules, official club & competition identities, key player form, head-to-head records and probabilistic combined coupons locked before kickoff."
                : "Programme officiel en direct, identités visuelles des clubs et compétitions, forme des joueurs clés, confrontations directes et coupons combinés verrouillés avant coup d'envoi."}
            </p>
          </div>

          <Button asChild variant="outline" className="self-start shrink-0">
            <Link href="/pronostics/historique">
              <BarChart2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {isEn ? "Accuracy & History" : "Historique & Précision"}
            </Link>
          </Button>
        </div>

        {/* Mobile-First 2x2 / Desktop 4-Column Live Telemetry Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="border-border/80 bg-surface/90">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span className="uppercase">
                  {isEn ? "Analyzed matches" : "Matchs analysables"}
                </span>
                <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
              </div>
              <p className="mt-1 font-display text-xl font-extrabold text-fg sm:text-2xl">
                {fixturesData.fixtures.length}
              </p>
              <p className="text-[11px] text-fg-muted">
                {fixturesData.leagues.length} {isEn ? "official leagues" : "compétitions"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface/90">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span className="uppercase">{isEn ? "Active markets" : "Marchés calculés"}</span>
                <Sparkles className="h-4 w-4 text-trust" aria-hidden="true" />
              </div>
              <p className="mt-1 font-display text-xl font-extrabold text-trust sm:text-2xl">
                {allPredictions.length}
              </p>
              <p className="text-[11px] text-fg-muted">
                {coupons.length} {isEn ? "combined coupons" : "coupons combinés"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface/90">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span className="uppercase">
                  {isEn ? "Avg AI confidence" : "Indice confiance IA"}
                </span>
                <Layers className="h-4 w-4 text-accent" aria-hidden="true" />
              </div>
              <p className="mt-1 font-display text-xl font-extrabold text-fg sm:text-2xl">
                {avgConfidencePct !== null ? `${avgConfidencePct}%` : "—"}
              </p>
              <p className="text-[11px] text-fg-muted">
                {isEn ? "Pre-kickoff locked" : "Verrouillé avant match"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface/90">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span className="uppercase">{isEn ? "Settled accuracy" : "Bilan vérifié"}</span>
                <ShieldCheck className="h-4 w-4 text-trust" aria-hidden="true" />
              </div>
              <p className="mt-1 font-display text-xl font-extrabold text-fg sm:text-2xl">
                {statsData.overall.winRatePct !== null
                  ? `${statsData.overall.winRatePct}%`
                  : isEn
                    ? "Live"
                    : "Actif"}
              </p>
              <p className="text-[11px] text-fg-muted">
                {statsData.overall.brierReady && statsData.overall.avgBrierScore !== null
                  ? `Brier ${statsData.overall.avgBrierScore.toFixed(3)} · ${statsData.overall.totalSettled} ${isEn ? "settled" : "réglés"}`
                  : statsData.overall.totalSettled > 0
                    ? `${statsData.overall.totalSettled}/50 ${isEn ? "for Brier score" : "pour score de Brier"}`
                    : isEn
                      ? "Auto-settled post-match"
                      : "Règlement auto après match"}
              </p>
            </CardContent>
          </Card>
        </div>
      </header>

      <AiResponsibilityNotice locale={resolvedLocale} />

      {/* Interactive Combined Coupons, Single Picks & Platform Games */}
      <CouponsSection
        coupons={coupons}
        singles={singles}
        guides={PLATFORM_GAMING_GUIDES}
        locale={resolvedLocale}
      />

      {/* Interactive Competition Carousel, Club Search & Match Cards */}
      <FixturesExplorer
        fixtures={fixturesData.fixtures}
        leagues={fixturesData.leagues}
        initialLeagueId={leagueFilter}
        locale={resolvedLocale}
      />
    </div>
  );
}
