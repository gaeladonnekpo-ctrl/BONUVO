"use client";

import { AlertCircle, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DataComponentState } from "./types";

export interface RatingScoreProps {
  score: number | null;
  max?: number;
  state?: DataComponentState;
  onRetry?: () => void;
  className?: string;
}

/**
 * Trust-green rating indicator strictly driven by verified rubric scores.
 */
export function RatingScore({
  score,
  max = 5,
  state = score === null ? "empty" : "content",
  onRetry,
  className,
}: RatingScoreProps) {
  const t = useTranslations("offerCard");
  const tStates = useTranslations("states");

  if (state === "loading") {
    return <Skeleton className={cn("h-8 w-24 rounded-full", className)} />;
  }

  if (state === "error") {
    return (
      <div
        role="alert"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-danger/40 bg-danger-soft px-3 py-1 text-xs font-semibold text-danger",
          className,
        )}
      >
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{tStates("errorDefaultTitle")}</span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="underline hover:no-underline cursor-pointer"
          >
            {tStates("retry")}
          </button>
        ) : null}
      </div>
    );
  }

  if (state === "empty" || score === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs font-medium text-fg-muted",
          className,
        )}
      >
        {t("ratingUnavailable")}
      </span>
    );
  }

  const clamped = Math.max(0, Math.min(score, max));
  const formattedScore = Number.isInteger(clamped) ? clamped.toFixed(1) : clamped.toFixed(1);

  return (
    <div
      aria-label={t("ratingOutOf", { score: formattedScore, max })}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-trust/40 bg-trust-soft px-3 py-1 font-mono text-sm font-bold text-trust",
        className,
      )}
    >
      <Star className="h-4 w-4 fill-current" aria-hidden="true" />
      <span>{formattedScore}</span>
      <span className="text-xs font-normal opacity-80">/ {max}</span>
    </div>
  );
}
