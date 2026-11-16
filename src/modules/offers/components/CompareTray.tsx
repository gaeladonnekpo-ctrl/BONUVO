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
      className="sticky bottom-4 z-30 rounded-card border border-accent/50 bg-surface-elevated p-3.5 shadow-lg"
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
                className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface px-2.5 py-0.5 text-xs font-medium text-fg hover:border-danger/60 cursor-pointer"
              >
                <span>{slug}</span>
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            {t("compareTrayClear")}
          </Button>
          <Button asChild variant="primary" size="sm" disabled={selectedSlugs.length < 2}>
            <Link href={compareHref}>{t("compareTrayButton")}</Link>
          </Button>
        </div>
      </div>
    </aside>
  );
}
