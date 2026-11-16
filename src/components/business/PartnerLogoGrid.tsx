import { Building2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
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
      {items.map((partner) => {
        const inner = (
          <>
            {partner.logoUrl ? (
              <Image
                src={partner.logoUrl}
                alt={partner.name}
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-lg border border-border-strong bg-surface-elevated object-contain p-0.5"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface-elevated font-display text-xs font-bold text-accent"
              >
                {partner.shortCode}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{partner.name}</p>
              <p className="truncate text-xs text-fg-muted">
                {partner.isDevExample ? tShowcase("sampleBadge") : (partner.licenseSummary ?? "—")}
              </p>
            </div>
          </>
        );

        return (
          <li
            key={partner.id}
            className="rounded-card border border-border bg-surface shadow-[var(--shadow-card)] transition hover:border-border-strong"
          >
            {partner.slug && !partner.isDevExample ? (
              <Link href={`/bookmakers/${partner.slug}`} className="flex items-center gap-3 p-3.5">
                {inner}
              </Link>
            ) : (
              <div className="flex items-center gap-3 p-3.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
