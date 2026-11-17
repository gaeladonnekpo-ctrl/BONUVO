import { cn } from "@/lib/utils";

export interface ProbabilitySegment {
  key: string;
  shortLabel: string;
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
      {
        key: "home",
        shortLabel: "1",
        label: isEn ? "Home" : "Dom.",
        probability: probabilities.home ?? 0,
      },
      {
        key: "draw",
        shortLabel: "X",
        label: isEn ? "Draw" : "Nul",
        probability: probabilities.draw ?? 0,
      },
      {
        key: "away",
        shortLabel: "2",
        label: isEn ? "Away" : "Ext.",
        probability: probabilities.away ?? 0,
      },
    ];
  }
  if (market === "over_under_25") {
    return [
      {
        key: "over_2_5",
        shortLabel: "+2.5",
        label: isEn ? "Over 2.5" : "+2,5 buts",
        probability: probabilities.over_2_5 ?? 0,
      },
      {
        key: "under_2_5",
        shortLabel: "-2.5",
        label: isEn ? "Under 2.5" : "-2,5 buts",
        probability: probabilities.under_2_5 ?? 0,
      },
    ];
  }
  return [
    {
      key: "yes",
      shortLabel: "Oui",
      label: isEn ? "BTTS Yes" : "BTTS Oui",
      probability: probabilities.yes ?? 0,
    },
    {
      key: "no",
      shortLabel: "Non",
      label: isEn ? "BTTS No" : "BTTS Non",
      probability: probabilities.no ?? 0,
    },
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
    <div className="space-y-2">
      <div
        className={cn(
          "grid gap-1.5 text-xs",
          segments.length === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {segments.map((seg) => {
          const pct = Math.round(seg.probability * 100);
          const isPicked = pickedSelection === seg.key;
          return (
            <div
              key={seg.key}
              className={cn(
                "flex items-center justify-between rounded-lg border px-2.5 py-1.5 transition-colors",
                isPicked
                  ? "border-accent bg-surface font-bold text-fg shadow-2xs"
                  : "border-border/70 bg-surface-subtle/60 text-fg-muted",
              )}
            >
              <span className="truncate">{seg.label}</span>
              <span className="ml-1 font-mono text-fg">{pct}%</span>
            </div>
          );
        })}
      </div>

      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full border border-border/80 bg-surface-elevated p-0.5"
        role="img"
        aria-label={segments
          .map((s) => `${s.label} ${Math.round(s.probability * 100)}%`)
          .join(", ")}
      >
        {segments.map((seg, idx) => {
          const widthPct = Math.max(2, Math.min(100, seg.probability * 100));
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
              className={cn(
                bg,
                "h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 ease-out",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
