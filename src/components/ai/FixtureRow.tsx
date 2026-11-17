import { CalendarClock, ChevronRight } from "lucide-react";
import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { ProbabilityBar } from "@/components/ai/ProbabilityBar";
import { UiBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { PublicFixtureDto } from "@/modules/ai/service/public-ai-types";

export interface FixtureRowProps {
  fixture: PublicFixtureDto;
  locale?: string;
}

export function FixtureRow({ fixture, locale = "fr" }: FixtureRowProps) {
  const isEn = locale === "en";
  const primary =
    fixture.predictions.find((p) => p.market === "1x2") ?? fixture.predictions[0] ?? null;

  const kickoffText = new Intl.DateTimeFormat(isEn ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fixture.kickoffAt));

  const scoreLine =
    fixture.fixtureStatus === "finished" && fixture.homeGoals !== null && fixture.awayGoals !== null
      ? `${fixture.homeGoals} - ${fixture.awayGoals}`
      : null;

  return (
    <Card className="transition-colors hover:border-border-strong">
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
          <div className="flex flex-wrap items-center gap-2">
            <UiBadge tone="outline">{fixture.leagueName}</UiBadge>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
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
            <UiBadge tone="neutral">
              {isEn ? "Insufficient sample (<6)" : "Échantillon insuffisant (<6)"}
            </UiBadge>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href={`/pronostics/${fixture.id}`}
              className="group inline-flex items-center gap-1.5 font-display text-base font-bold text-fg hover:text-accent"
            >
              <span>
                {fixture.homeTeamName} vs {fixture.awayTeamName}
              </span>
              <ChevronRight
                className="h-4 w-4 text-fg-muted transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            {scoreLine ? (
              <p className="mt-0.5 text-sm font-semibold text-trust">
                {isEn ? "Final score" : "Score final"} : {scoreLine}
              </p>
            ) : null}
          </div>

          {primary?.verdict ? (
            <UiBadge
              tone={
                primary.verdict === "won"
                  ? "trust"
                  : primary.verdict === "lost"
                    ? "danger"
                    : "neutral"
              }
            >
              {primary.verdict === "won"
                ? isEn
                  ? "Hit"
                  : "Validé"
                : primary.verdict === "lost"
                  ? isEn
                    ? "Missed"
                    : "Manqué"
                  : "Void"}
            </UiBadge>
          ) : null}
        </div>

        {primary ? (
          <ProbabilityBar
            market={primary.market}
            probabilities={primary.probabilities}
            pickedSelection={primary.pickedSelection}
            locale={locale}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
