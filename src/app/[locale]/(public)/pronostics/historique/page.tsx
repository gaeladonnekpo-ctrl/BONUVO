import { ArrowLeft } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { AccuracyChart } from "@/components/ai/AccuracyChart";
import { AiResponsibilityNotice } from "@/components/ai/AiResponsibilityNotice";
import { CouponTrackRecordSection } from "@/components/ai/CouponTrackRecordSection";
import { FixtureRow } from "@/components/ai/FixtureRow";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import {
  getPublicPredictionStats,
  listPublicFixtures,
} from "@/modules/ai/service/public-ai-service";
import { getPublicCouponTrackRecord } from "@/modules/ai/service/public-coupon-history";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = locale === "en" ? "en" : "fr";
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    pathname: "/pronostics/historique",
    title:
      resolvedLocale === "en"
        ? "BONUVO AI Prediction Accuracy & Track Record"
        : "Historique & Précision BONUVO AI",
    description:
      resolvedLocale === "en"
        ? "Transparent settled track record and hit rate by BONUVO AI."
        : "Bilan transparent des pronostics terminés et taux de réussite BONUVO AI.",
  });
}

export default async function PublicPredictionHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const resolvedLocale: "fr" | "en" = locale === "en" ? "en" : "fr";
  const isEn = resolvedLocale === "en";

  const [stats, settledData, couponRecord] = await Promise.all([
    getPublicPredictionStats(),
    listPublicFixtures({ settledOnly: true, limit: 30 }),
    getPublicCouponTrackRecord(),
  ]);

  const marketCards = [
    { key: "1x2", label: "1X2", summary: stats.byMarket["1x2"] },
    { key: "over_under_25", label: "+/- 2.5 buts", summary: stats.byMarket.over_under_25 },
    { key: "btts", label: "BTTS", summary: stats.byMarket.btts },
  ];

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/pronostics">
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {isEn ? "Upcoming forecasts" : "Pronostics à venir"}
          </Link>
        </Button>
        <UiBadge tone="outline">BONUVO AI</UiBadge>
      </div>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-fg">
          {isEn ? "BONUVO AI Track Record" : "Historique & Précision BONUVO AI"}
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          {isEn
            ? "Every forecast is locked before kickoff and settled automatically after full time. Postponed or cancelled matches are excluded from the win rate."
            : "Chaque pronostic est verrouillé avant le coup d'envoi puis mis à jour automatiquement après le score final. Les matchs reportés ou annulés sont neutralisés."}
        </p>
      </header>

      <AiResponsibilityNotice locale={resolvedLocale} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-fg-muted">
              {isEn ? "Settled picks" : "Pronostics terminés"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-fg">
              {stats.overall.totalSettled}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-fg-muted">
              {isEn ? "Won / Lost" : "Validés / Manqués"}
            </p>
            <p className="mt-1 font-display text-xl font-bold text-fg">
              {stats.overall.won} / {stats.overall.lost}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-fg-muted">
              {isEn ? "Global win rate" : "Taux de réussite"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-trust">
              {stats.overall.winRatePct !== null ? `${stats.overall.winRatePct}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-fg-muted">
              {isEn ? "Postponed / Cancelled" : "Matchs reportés / annulés"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-fg">
              {stats.overall.voidCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-fg-muted">
              {isEn ? "Brier score" : "Score de Brier"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-fg">
              {stats.overall.brierReady && stats.overall.avgBrierScore !== null
                ? stats.overall.avgBrierScore.toFixed(3)
                : `${stats.overall.won + stats.overall.lost}/50`}
            </p>
            <p className="mt-0.5 text-[11px] text-fg-muted">
              {stats.overall.brierReady
                ? isEn
                  ? "Lower is better calibrated"
                  : "Plus proche de 0 = mieux calibré"
                : isEn
                  ? "Displayed from 50 settled matches"
                  : "Affiché dès 50 matchs réglés"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {marketCards.map((mc) => (
          <Card key={mc.key}>
            <CardContent className="pt-5 space-y-1">
              <p className="text-xs font-mono uppercase text-fg-muted">{mc.label}</p>
              <p className="font-display text-lg font-bold text-fg">
                {mc.summary.winRatePct !== null ? `${mc.summary.winRatePct}%` : "—"}
              </p>
              <p className="text-xs text-fg-muted">
                {mc.summary.won} {isEn ? "won" : "validés"} · {mc.summary.totalSettled}{" "}
                {isEn ? "settled" : "terminés"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AccuracyChart timeline={stats.timeline} locale={resolvedLocale} />

      <CouponTrackRecordSection record={couponRecord} locale={resolvedLocale} />

      <section aria-labelledby="settled-fixtures-heading" className="space-y-4">
        <h2 id="settled-fixtures-heading" className="font-display text-xl font-bold text-fg">
          {isEn ? "Winning Settled Fixtures" : "Rencontres déjà réglées (Pronostics validés)"}
        </h2>
        {(() => {
          const wonFixtures = settledData.fixtures.filter((fix) =>
            fix.predictions.some((p) => p.verdict === "won"),
          );
          if (wonFixtures.length === 0) {
            return (
              <p className="text-sm text-fg-muted">
                {isEn
                  ? "No winning settled fixtures available yet."
                  : "Aucune rencontre avec pronostic gagnant confirmé pour le moment."}
              </p>
            );
          }
          return (
            <div className="grid gap-4 md:grid-cols-2">
              {wonFixtures.map((fix) => (
                <FixtureRow key={fix.id} fixture={fix} locale={resolvedLocale} />
              ))}
            </div>
          );
        })()}
      </section>
    </div>
  );
}
