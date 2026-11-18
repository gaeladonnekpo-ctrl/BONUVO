"use client";

import { Check, Globe, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { createPortal } from "react-dom";
import { compareByBettingPriority, getBettingPriorityTier } from "@/lib/i18n/betting-priority";
import { type ContinentKey, type CountryOption } from "@/lib/i18n/countries";
import { cn } from "@/lib/utils";

const CONTINENT_ORDER: readonly ContinentKey[] = [
  "africa",
  "europe",
  "americas",
  "asia",
  "oceania",
];

type ZoneFilter = "all" | ContinentKey;

export function formatCountryDisplay(
  item: CountryOption,
  locale: "fr" | "en",
  globalLabel: string,
): string {
  if (item.code === "GLOBAL") return globalLabel;
  const localized = locale === "en" ? item.nameEn : item.nameFr;
  if (localized) return localized;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(item.code) ?? item.code;
  } catch {
    return item.code;
  }
}

function CountryOptionButton({
  item,
  label,
  selected,
  onSelect,
}: {
  item: CountryOption;
  label: string;
  selected: boolean;
  onSelect: (code: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(item.code)}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        selected ? "bg-accent/15 font-semibold text-fg" : "text-fg hover:bg-surface-elevated",
      )}
    >
      <span className="truncate">{label}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="font-mono text-xs text-fg-muted">{item.code}</span>
        {selected ? <Check className="h-4 w-4 text-accent" aria-hidden="true" /> : null}
      </span>
    </button>
  );
}

export interface CountrySwitcherModalProps {
  open: boolean;
  listboxId: string;
  country: string;
  locale: "fr" | "en";
  options: readonly CountryOption[];
  onClose: () => void;
  onSelect: (code: string) => void;
}

export function CountrySwitcherModal({
  open,
  listboxId,
  country,
  locale,
  options,
  onClose,
  onSelect,
}: CountrySwitcherModalProps) {
  const isFr = locale === "fr";
  const tControls = useTranslations("controls");
  const tContinents = useTranslations("continents");
  const tCountries = useTranslations("countries");
  const globalLabel = tCountries("GLOBAL");

  const [query, setQuery] = React.useState("");
  const [zone, setZone] = React.useState<ZoneFilter>("all");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(id);
    };
  }, [open, onClose]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = React.useMemo(() => {
    if (!open) return [];
    return options.filter((item) => {
      if (zone !== "all" && item.continent !== zone) return false;
      if (!normalizedQuery) return true;
      const display = formatCountryDisplay(item, locale, globalLabel).toLowerCase();
      return (
        display.includes(normalizedQuery) ||
        item.code.toLowerCase().includes(normalizedQuery) ||
        item.currency.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [open, options, zone, normalizedQuery, locale, globalLabel]);

  if (!open || typeof document === "undefined") return null;

  const globalItem = filteredOptions.find((c) => c.code === "GLOBAL");
  const nonGlobal = filteredOptions.filter((c) => c.code !== "GLOBAL");
  const priorityItems =
    !normalizedQuery && zone === "all"
      ? nonGlobal.filter((c) => getBettingPriorityTier(c.code) <= 2).sort(compareByBettingPriority)
      : [];
  const priorityCodes = new Set(priorityItems.map((c) => c.code));
  const remainingItems = nonGlobal.filter((c) => !priorityCodes.has(c.code));

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 pt-14 backdrop-blur-xs sm:pt-20"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={tControls("countryLabel")}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[82dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface text-fg shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-accent" aria-hidden="true" />
            <h2 className="font-display text-sm font-bold text-fg">
              {isFr ? "Sélectionner un pays ou une zone" : "Select a country or region"}
            </h2>
          </div>
          <button
            type="button"
            aria-label={isFr ? "Fermer" : "Close"}
            onClick={onClose}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-fg-muted hover:bg-surface-elevated hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 border-b border-border px-4 py-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-muted"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isFr
                  ? "Rechercher un pays, code (BJ, CI, FR) ou devise..."
                  : "Search country, code (NG, BJ, FR) or currency..."
              }
              className="h-10 w-full rounded-xl border border-border bg-bg pr-3 pl-9 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(["all", "global", ...CONTINENT_ORDER] as const).map((z) => {
              const active = zone === z;
              const label =
                z === "all" ? (isFr ? "Toutes les zones" : "All regions") : tContinents(z);
              return (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZone(z)}
                  className={cn(
                    "cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                    active
                      ? "bg-accent text-accent-fg"
                      : "border border-border bg-surface-subtle text-fg-muted hover:text-fg",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          id={listboxId}
          role="listbox"
          aria-label={tControls("countryLabel")}
          className="flex-1 overflow-y-auto p-2"
        >
          {filteredOptions.length === 0 ? (
            <p className="py-8 text-center text-sm text-fg-muted">
              {isFr ? "Aucun pays trouvé pour cette recherche." : "No country found."}
            </p>
          ) : (
            <div className="space-y-3">
              {globalItem ? (
                <div>
                  <p className="px-3 py-1 text-[11px] font-bold tracking-wider text-fg-muted uppercase">
                    {tContinents("global")}
                  </p>
                  <CountryOptionButton
                    item={globalItem}
                    label={`${formatCountryDisplay(globalItem, locale, globalLabel)} (${globalItem.currency})`}
                    selected={country === globalItem.code}
                    onSelect={(code) => {
                      setQuery("");
                      onSelect(code);
                    }}
                  />
                </div>
              ) : null}

              {priorityItems.length > 0 ? (
                <div>
                  <p className="px-3 py-1 text-[11px] font-bold tracking-wider text-fg-muted uppercase">
                    {isFr ? "Top Paris Sportifs & Gaming" : "Top Sports Betting & Gaming"}
                  </p>
                  {priorityItems.map((item) => (
                    <CountryOptionButton
                      key={item.code}
                      item={item}
                      label={`${formatCountryDisplay(item, locale, globalLabel)} (${item.currency})`}
                      selected={country === item.code}
                      onSelect={(code) => {
                        setQuery("");
                        onSelect(code);
                      }}
                    />
                  ))}
                </div>
              ) : null}

              {CONTINENT_ORDER.map((continent) => {
                const items = remainingItems.filter((item) => item.continent === continent);
                if (items.length === 0) return null;
                return (
                  <div key={continent}>
                    <p className="px-3 py-1 text-[11px] font-bold tracking-wider text-fg-muted uppercase">
                      {tContinents(continent)}
                    </p>
                    {items.map((item) => (
                      <CountryOptionButton
                        key={item.code}
                        item={item}
                        label={`${formatCountryDisplay(item, locale, globalLabel)} (${item.currency})`}
                        selected={country === item.code}
                        onSelect={(code) => {
                          setQuery("");
                          onSelect(code);
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
