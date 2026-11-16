"use client";

import { ArrowUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PublicOfferSort } from "@/modules/offers/public-schema";

export interface SortMenuProps {
  value: PublicOfferSort;
  onChange: (value: PublicOfferSort) => void;
}

export function SortMenu({ value, onChange }: SortMenuProps) {
  const t = useTranslations("publicCatalog");

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted">
        <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t("sortLabel")}</span>
      </span>
      <Select value={value} onValueChange={(next) => onChange(next as PublicOfferSort)}>
        <SelectTrigger aria-label={t("sortLabel")} className="h-9 min-w-[11rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="rank">{t("sortRank")}</SelectItem>
          <SelectItem value="rating">{t("sortRating")}</SelectItem>
          <SelectItem value="bonus">{t("sortBonus")}</SelectItem>
          <SelectItem value="recent">{t("sortRecent")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
