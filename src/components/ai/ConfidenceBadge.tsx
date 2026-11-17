import { UiBadge } from "@/components/ui/badge";

export interface ConfidenceBadgeProps {
  level: "low" | "medium" | "high";
  score?: number;
  locale?: string;
}

export function ConfidenceBadge({ level, score, locale = "fr" }: ConfidenceBadgeProps) {
  const isEn = locale === "en";
  const label =
    level === "high"
      ? isEn
        ? "High confidence"
        : "Confiance élevée"
      : level === "medium"
        ? isEn
          ? "Medium confidence"
          : "Confiance moyenne"
        : isEn
          ? "Low confidence"
          : "Confiance faible";

  const tone = level === "high" ? "trust" : level === "medium" ? "accent" : "neutral";

  const pct =
    typeof score === "number" && Number.isFinite(score) ? ` · ${Math.round(score * 100)}%` : "";

  return (
    <UiBadge tone={tone}>
      {label}
      {pct}
    </UiBadge>
  );
}
