import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DataComponentState, PartnerGridItem } from "./types";

export interface PartnerLogoGridProps {
  items: readonly PartnerGridItem[];
  state?: DataComponentState;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Responsive operator grid displaying monogram tiles until verified assets are stored.
 */
export function PartnerLogoGrid({
  items,
  state = items.length === 0 ? "empty" : "content",
  emptyTitle,
  emptyDescription,
  onRetry,
  className,
}: PartnerLogoGridProps) {
  const tHome = useTranslations("home");
  const tStates = useTranslations("states");
  const tShowcase = useTranslations("designShowcase");

  if (state === "loading") {
    return (
      <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-card" />
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <ErrorState
        title={tStates("errorDefaultTitle")}
        description={tStates("errorDefaultDescription")}
        retryLabel={tStates("retry")}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  if (state === "empty" || items.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
        title={emptyTitle ?? tHome("partnersEmptyTitle")}
        description={emptyDescription ?? tHome("partnersEmptyDescription")}
        className={className}
      />
    );
  }

  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {items.map((partner) => (
        <li
          key={partner.id}
          className="flex items-center gap-3 rounded-card border border-border bg-surface p-3.5 shadow-[var(--shadow-card)]"
        >
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface-elevated font-display text-xs font-bold text-accent"
          >
            {partner.shortCode}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{partner.name}</p>
            <p className="truncate text-xs text-fg-muted">
              {partner.isDevExample ? tShowcase("sampleBadge") : (partner.licenseSummary ?? "—")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
