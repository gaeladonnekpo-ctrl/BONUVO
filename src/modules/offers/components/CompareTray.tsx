"use client";

import { Scale, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export interface CompareTrayProps {
  selectedSlugs: readonly string[];
  onRemoveSlug: (slug: string) => void;
  onClear: () => void;
}

export function CompareTray({ selectedSlugs, onRemoveSlug, onClear }: CompareTrayProps) {
  const t = useTranslations("publicCatalog");

  if (selectedSlugs.length === 0) return null;

  const compareHref = `/comparateur?offres=${encodeURIComponent(selectedSlugs.join(","))}`;

  return (
    <aside
      aria-label={t("compareTrayCount", { count: selectedSlugs.length })}
      className="animate-bonuvo-tray sticky bottom-20 z-40 rounded-card border border-accent/50 bg-surface-elevated/95 p-3.5 shadow-lg backdrop-blur-xs transition-[transform,opacity] duration-200 sm:bottom-4 sm:mr-20"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Scale className="h-4 w-4 text-accent" aria-hidden="true" />
          <span className="text-sm font-semibold text-fg">
            {t("compareTrayCount", { count: selectedSlugs.length })}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {selectedSlugs.map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => onRemoveSlug(slug)}
                className="animate-bonuvo-chip inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface px-2.5 py-0.5 text-xs font-medium text-fg transition-[transform,opacity] duration-150 hover:scale-[1.03] hover:border-danger/60 active:scale-[0.97] cursor-pointer"
              >
                <span>{slug}</span>
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="transition-transform duration-150 active:scale-[0.97]"
          >
            {t("compareTrayClear")}
          </Button>
          <Button
            asChild
            variant="primary"
            size="sm"
            disabled={selectedSlugs.length < 2}
            className="transition-[transform,opacity] duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Link href={compareHref}>{t("compareTrayButton")}</Link>
          </Button>
        </div>
      </div>
    </aside>
  );
}
