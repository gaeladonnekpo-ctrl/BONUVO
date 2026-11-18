import { ArrowUpRight, CalendarClock, Sparkles } from "lucide-react";
import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { ProbabilityBar } from "@/components/ai/ProbabilityBar";
import { LeagueBadge, TeamCrest } from "@/components/ai/SportCrest";
import { UiBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { PublicFixtureDto } from "@/modules/ai/service/public-ai-types";

export interface FixtureRowProps {
  fixture: PublicFixtureDto;
  locale?: string;
}

function getRecommendedPickLabel(
  fixture: PublicFixtureDto,
  market: string,
  pick: string,
  isEn: boolean,
): string {
  if (market === "1x2") {
    if (pick === "home") return `${fixture.homeTeamName}`;
    if (pick === "away") return `${fixture.awayTeamName}`;
    return isEn ? "Draw (X)" : "Match nul (X)";
  }
  if (market === "over_under_25") {
    return pick === "over_2_5"
      ? isEn
        ? "Over 2.5 goals"
        : "+2,5 buts"
      : isEn
        ? "Under 2.5 goals"
        : "-2,5 buts";
  }
  return pick === "yes" ? (isEn ? "BTTS Yes" : "BTTS Oui") : isEn ? "BTTS No" : "BTTS Non";
}

export function FixtureRow({ fixture, locale = "fr" }: FixtureRowProps) {
  const isEn = locale === "en";
  const primary =
    fixture.predictions.find((p) => p.market === "1x2") ?? fixture.predictions[0] ?? null;
  const ouMarket = fixture.predictions.find((p) => p.market === "over_under_25");
  const bttsMarket = fixture.predictions.find((p) => p.market === "btts");

  const kickoffText = new Intl.DateTimeFormat(isEn ? "en-GB" : "fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fixture.kickoffAt));

  const scoreLine =
    fixture.fixtureStatus === "finished" && fixture.homeGoals !== null && fixture.awayGoals !== null
      ? `${fixture.homeGoals} - ${fixture.awayGoals}`
      : null;

  const xgBadge =
    primary && !scoreLine
      ? `xG ${primary.expectedHomeGoals.toFixed(1)} - ${primary.expectedAwayGoals.toFixed(1)}`
      : null;

  const topPickProb = primary
    ? Math.round((primary.probabilities[primary.pickedSelection] ?? 0) * 100)
    : null;

  return (
    <Card className="group relative overflow-hidden border-border/90 bg-surface transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-md">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-trust via-accent to-warning opacity-75 transition-opacity group-hover:opacity-100" />
      <CardContent className="space-y-4 p-4 sm:p-5">
        {/* Top Competition & Confidence Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <LeagueBadge
              name={fixture.leagueName}
              logoUrl={fixture.leagueLogo}
              countryName={fixture.countryName}
            />
            <span className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted">
              <CalendarClock className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              {kickoffText}
            </span>
          </div>

          {primary ? (
            <ConfidenceBadge
              level={primary.confidenceLevel}
              score={primary.confidenceScore}
              locale={locale}
            />
          ) : (
            <UiBadge tone="neutral">{isEn ? "Analysis in progress" : "Analyse en cours"}</UiBadge>
          )}
        </div>

        {/* Mobile-First 3-Column Club Matchup Arena */}
        <Link
          href={`/pronostics/${fixture.id}`}
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-border/70 bg-surface-subtle/60 p-3 transition-colors group-hover:border-border-strong sm:gap-4 sm:p-3.5"
        >
          <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
            <TeamCrest name={fixture.homeTeamName} logoUrl={fixture.homeTeamLogo} />
            <div className="min-w-0">
              <p className="line-clamp-2 font-display text-xs font-bold leading-tight text-fg sm:text-sm">
                {fixture.homeTeamName}
              </p>
              <span className="text-[10px] font-medium uppercase tracking-wider text-fg-muted">
                {isEn ? "Home" : "Domicile"}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center px-1.5 text-center">
            {scoreLine ? (
              <span className="rounded-xl border border-trust/40 bg-trust-soft px-2.5 py-1 font-display text-sm font-extrabold text-trust">
                {scoreLine}
              </span>
            ) : (
              <span className="rounded-xl border border-border bg-surface px-2.5 py-1 font-display text-xs font-bold text-fg-muted">
                VS
              </span>
            )}
            {xgBadge ? (
              <span className="mt-1 font-mono text-[10px] font-semibold text-fg-muted">
                {xgBadge}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row-reverse sm:text-right">
            <TeamCrest name={fixture.awayTeamName} logoUrl={fixture.awayTeamLogo} />
            <div className="min-w-0">
              <p className="line-clamp-2 font-display text-xs font-bold leading-tight text-fg sm:text-sm">
                {fixture.awayTeamName}
              </p>
              <span className="text-[10px] font-medium uppercase tracking-wider text-fg-muted">
                {isEn ? "Away" : "Extérieur"}
              </span>
            </div>
          </div>
        </Link>

        {/* BONUVO AI Recommended Selection & Secondary Markets */}
        {primary ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-strong bg-surface-subtle px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                <span className="text-fg-muted">
                  {isEn ? "BONUVO AI Pick:" : " Tendance BONUVO AI :"}
                </span>
                <strong className="font-semibold text-fg">
                  {getRecommendedPickLabel(fixture, primary.market, primary.pickedSelection, isEn)}
                </strong>
                {topPickProb !== null ? (
                  <span className="font-mono font-bold text-fg">({topPickProb}%)</span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {ouMarket ? (
                  <span className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-fg-muted">
                    +2.5: {Math.round((ouMarket.probabilities.over_2_5 ?? 0) * 100)}%
                  </span>
                ) : null}
                {bttsMarket ? (
                  <span className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-fg-muted">
                    BTTS: {Math.round((bttsMarket.probabilities.yes ?? 0) * 100)}%
                  </span>
                ) : null}
              </div>
            </div>

            <ProbabilityBar
              market={primary.market}
              probabilities={primary.probabilities}
              pickedSelection={primary.pickedSelection}
              locale={locale}
            />
          </div>
        ) : null}

        {/* Touch-friendly Mobile Footer Action */}
        <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
          <span className="truncate text-fg-muted">
            {fixture.venueName || (isEn ? "Official fixture" : "Rencontre officielle")}
          </span>
          <Link
            href={`/pronostics/${fixture.id}`}
            className="inline-flex shrink-0 items-center gap-1 font-semibold text-fg transition-transform group-hover:translate-x-0.5 hover:text-accent"
          >
            <span>{isEn ? "Full AI analysis & H2H" : "Analyse IA, joueurs & H2H"}</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
