"use client";

import { RotateCcw, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { PublicPaymentMethodSummary } from "@/modules/offers/public-types";

export interface FilterBarProps {
  search: string;
  offerType: string;
  payment: string;
  maxDeposit: number | null;
  withCodeOnly: boolean;
  bookmakerSlug: string;
  paymentMethods: readonly PublicPaymentMethodSummary[];
  bookmakers: ReadonlyArray<{ slug: string; name: string }>;
  onSearchChange: (val: string) => void;
  onTypeChange: (val: string) => void;
  onPaymentChange: (val: string) => void;
  onMaxDepositChange: (val: number | null) => void;
  onWithCodeChange: (val: boolean) => void;
  onBookmakerChange: (val: string) => void;
  onReset: () => void;
}

export function FilterBar({
  search,
  offerType,
  payment,
  maxDeposit,
  withCodeOnly,
  bookmakerSlug,
  paymentMethods,
  bookmakers,
  onSearchChange,
  onTypeChange,
  onPaymentChange,
  onMaxDepositChange,
  onWithCodeChange,
  onBookmakerChange,
  onReset,
}: FilterBarProps) {
  const t = useTranslations("publicCatalog");
  const hasActiveFilter =
    Boolean(search) ||
    offerType !== "all" ||
    Boolean(payment) ||
    maxDeposit !== null ||
    withCodeOnly ||
    Boolean(bookmakerSlug);

  return (
    <section
      aria-label={t("filterTypeLabel")}
      className="rounded-card border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5"
    >
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-[minmax(235px,1.35fr)_repeat(4,minmax(0,1fr))] lg:items-end">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label
            htmlFor="offers-search"
            className="block truncate text-xs font-semibold tracking-wide text-fg-muted"
          >
            {t("filterSearchLabel")}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-muted"
              aria-hidden="true"
            />
            <Input
              id="offers-search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("filterSearchPlaceholder")}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <label
            htmlFor="offers-type"
            className="block truncate text-xs font-semibold tracking-wide text-fg-muted"
          >
            {t("filterTypeLabel")}
          </label>
          <Select value={offerType} onValueChange={onTypeChange}>
            <SelectTrigger
              id="offers-type"
              aria-label={t("filterTypeLabel")}
              className="flex w-full [&>span]:truncate"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterTypeAll")}</SelectItem>
              <SelectItem value="welcome">{t("filterTypeWelcome")}</SelectItem>
              <SelectItem value="special">{t("filterTypeSpecial")}</SelectItem>
              <SelectItem value="reload">{t("filterTypeReload")}</SelectItem>
              <SelectItem value="cashback">{t("filterTypeCashback")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <label
            htmlFor="offers-payment"
            className="block truncate text-xs font-semibold tracking-wide text-fg-muted"
          >
            {t("filterPaymentLabel")}
          </label>
          <Select
            value={payment || "__all__"}
            onValueChange={(val) => onPaymentChange(val === "__all__" ? "" : val)}
          >
            <SelectTrigger
              id="offers-payment"
              aria-label={t("filterPaymentLabel")}
              className="flex w-full [&>span]:truncate"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("filterPaymentAll")}</SelectItem>
              {paymentMethods.map((pm) => (
                <SelectItem key={pm.slug} value={pm.slug}>
                  {pm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <label
            htmlFor="offers-bookmaker"
            className="block truncate text-xs font-semibold tracking-wide text-fg-muted"
          >
            {t("compareRowBookmaker")}
          </label>
          <Select
            value={bookmakerSlug || "__all__"}
            onValueChange={(val) => onBookmakerChange(val === "__all__" ? "" : val)}
          >
            <SelectTrigger
              id="offers-bookmaker"
              aria-label={t("compareRowBookmaker")}
              className="flex w-full [&>span]:truncate"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("filterBookmakerAll")}</SelectItem>
              {bookmakers.map((bm) => (
                <SelectItem key={bm.slug} value={bm.slug}>
                  {bm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <label
            htmlFor="offers-max-deposit"
            className="block truncate text-xs font-semibold tracking-wide text-fg-muted"
          >
            {t("filterMaxDepositLabel")}
          </label>
          <Input
            id="offers-max-deposit"
            type="number"
            min={0}
            value={maxDeposit ?? ""}
            placeholder={t("filterMaxDepositPlaceholder")}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw) return onMaxDepositChange(null);
              const parsed = Number(raw);
              if (Number.isFinite(parsed) && parsed >= 0) onMaxDepositChange(parsed);
            }}
          />
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
        <label className="inline-flex items-center gap-2 text-xs font-medium text-fg cursor-pointer">
          <Switch checked={withCodeOnly} onCheckedChange={onWithCodeChange} />
          <span>{t("filterWithCodeLabel")}</span>
        </label>

        {hasActiveFilter ? (
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("filterReset")}</span>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
