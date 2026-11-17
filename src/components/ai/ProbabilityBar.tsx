export interface ProbabilitySegment {
  key: string;
  label: string;
  probability: number;
}

export interface ProbabilityBarProps {
  market: "1x2" | "over_under_25" | "btts";
  probabilities: Record<string, number>;
  pickedSelection?: string;
  locale?: string;
}

function getSegments(
  market: "1x2" | "over_under_25" | "btts",
  probabilities: Record<string, number>,
  locale: string,
): ProbabilitySegment[] {
  const isEn = locale === "en";
  if (market === "1x2") {
    return [
      { key: "home", label: isEn ? "Home" : "Dom.", probability: probabilities.home ?? 0 },
      { key: "draw", label: isEn ? "Draw" : "Nul", probability: probabilities.draw ?? 0 },
      { key: "away", label: isEn ? "Away" : "Ext.", probability: probabilities.away ?? 0 },
    ];
  }
  if (market === "over_under_25") {
    return [
      {
        key: "over_2_5",
        label: isEn ? "Over 2.5" : "+2,5 buts",
        probability: probabilities.over_2_5 ?? 0,
      },
      {
        key: "under_2_5",
        label: isEn ? "Under 2.5" : "-2,5 buts",
        probability: probabilities.under_2_5 ?? 0,
      },
    ];
  }
  return [
    { key: "yes", label: isEn ? "BTTS Yes" : "BTTS Oui", probability: probabilities.yes ?? 0 },
    { key: "no", label: isEn ? "BTTS No" : "BTTS Non", probability: probabilities.no ?? 0 },
  ];
}

export function ProbabilityBar({
  market,
  probabilities,
  pickedSelection,
  locale = "fr",
}: ProbabilityBarProps) {
  const segments = getSegments(market, probabilities, locale);

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:justify-between text-xs">
        {segments.map((seg) => {
          const pct = Math.round(seg.probability * 100);
          const isPicked = pickedSelection === seg.key;
          return (
            <span key={seg.key} className={isPicked ? "font-semibold text-fg" : "text-fg-muted"}>
              {seg.label} {pct}%
            </span>
          );
        })}
      </div>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-elevated border border-border"
        role="img"
        aria-label={segments
          .map((s) => `${s.label} ${Math.round(s.probability * 100)}%`)
          .join(", ")}
      >
        {segments.map((seg, idx) => {
          const widthPct = Math.max(0, Math.min(100, seg.probability * 100));
          const bg =
            idx === 0
              ? "bg-trust"
              : idx === 1 && segments.length === 3
                ? "bg-warning"
                : "bg-accent";
          return (
            <div
              key={seg.key}
              style={{ width: `${widthPct}%` }}
              className={`${bg} h-full transition-all`}
            />
          );
        })}
      </div>
    </div>
  );
}
