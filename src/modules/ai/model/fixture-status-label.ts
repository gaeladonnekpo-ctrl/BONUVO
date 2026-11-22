import type { PublicFixtureDto } from "@/modules/ai/service/public-ai-types";

export interface FixtureLivePresentation {
  scoreLine: string | null;
  statusLabel: string | null;
  statusTone: "accent" | "trust" | "warning" | "outline" | "neutral";
  isLive: boolean;
  scoreUnavailable: boolean;
}

/**
 * Resolves consistent score line and status badge text (live minute, halftime,
 * extra time, penalties, finished, postponed/cancelled, or unavailable score)
 * across match cards and match detail pages.
 */
export function resolveFixturePresentation(
  fixture: Pick<
    PublicFixtureDto,
    | "fixtureStatus"
    | "homeGoals"
    | "awayGoals"
    | "kickoffAt"
    | "livePhase"
    | "displayClock"
    | "statusDetail"
  >,
  isEn: boolean,
  nowMs = Date.now(),
): FixtureLivePresentation {
  const hasScore =
    (fixture.fixtureStatus === "finished" || fixture.fixtureStatus === "live") &&
    fixture.homeGoals !== null &&
    fixture.awayGoals !== null;

  const scoreLine = hasScore ? `${fixture.homeGoals} - ${fixture.awayGoals}` : null;
  const isPostponedOrCancelled = ["postponed", "cancelled", "abandoned"].includes(
    fixture.fixtureStatus,
  );

  if (fixture.fixtureStatus === "live") {
    const clock = fixture.displayClock?.trim();
    if (fixture.livePhase === "halftime") {
      return {
        scoreLine,
        statusLabel: isEn ? "Halftime" : "Mi-temps",
        statusTone: "accent",
        isLive: true,
        scoreUnavailable: !hasScore,
      };
    }
    if (fixture.livePhase === "penalties") {
      return {
        scoreLine,
        statusLabel: isEn ? "Penalties" : "Tirs au but",
        statusTone: "accent",
        isLive: true,
        scoreUnavailable: !hasScore,
      };
    }
    if (fixture.livePhase === "extra_time") {
      return {
        scoreLine,
        statusLabel: clock
          ? `${isEn ? "Extra Time" : "Prolongations"} · ${clock}`
          : isEn
            ? "Extra Time"
            : "Prolongations",
        statusTone: "accent",
        isLive: true,
        scoreUnavailable: !hasScore,
      };
    }
    return {
      scoreLine,
      statusLabel: clock
        ? `${isEn ? "Live" : "En direct"} · ${clock}`
        : isEn
          ? "Live"
          : "En direct",
      statusTone: "accent",
      isLive: true,
      scoreUnavailable: !hasScore,
    };
  }

  if (fixture.fixtureStatus === "finished") {
    const detail = fixture.statusDetail?.trim();
    const extraSuffix =
      detail && (detail === "AET" || detail === "PEN" || detail === "AP") ? ` · ${detail}` : "";
    return {
      scoreLine,
      statusLabel: `${isEn ? "Finished" : "Terminé"}${extraSuffix}`,
      statusTone: "trust",
      isLive: false,
      scoreUnavailable: !hasScore,
    };
  }

  if (isPostponedOrCancelled) {
    const label =
      fixture.fixtureStatus === "cancelled"
        ? isEn
          ? "Cancelled"
          : "Annulé"
        : fixture.fixtureStatus === "abandoned"
          ? isEn
            ? "Abandoned"
            : "Interrompu"
          : isEn
            ? "Postponed"
            : "Reporté";
    return {
      scoreLine: null,
      statusLabel: label,
      statusTone: "warning",
      isLive: false,
      scoreUnavailable: false,
    };
  }

  const kickoffMs = Date.parse(fixture.kickoffAt);
  const pastKickoffWithoutScore =
    fixture.fixtureStatus === "scheduled" &&
    Number.isFinite(kickoffMs) &&
    nowMs - kickoffMs > 5 * 60_000 &&
    nowMs - kickoffMs < 6 * 3600_000;

  if (pastKickoffWithoutScore) {
    return {
      scoreLine: null,
      statusLabel: isEn ? "Score temporarily unavailable" : "Score momentanément indisponible",
      statusTone: "warning",
      isLive: false,
      scoreUnavailable: true,
    };
  }

  return {
    scoreLine: null,
    statusLabel: isEn ? "Upcoming" : "À venir",
    statusTone: "outline",
    isLive: false,
    scoreUnavailable: false,
  };
}
