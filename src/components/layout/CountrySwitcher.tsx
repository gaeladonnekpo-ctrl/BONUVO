"use client";

import { Globe } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { compareByBettingPriority, getBettingPriorityTier } from "@/lib/i18n/betting-priority";
import {
  COUNTRY_COOKIE_NAME,
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY_CODE,
  normalizeCountryCode,
  type ContinentKey,
  type CountryOption,
} from "@/lib/i18n/countries";
import { cn } from "@/lib/utils";
import { usePublicCountries } from "./public-countries-context";

const CONTINENT_ORDER: readonly ContinentKey[] = [
  "africa",
  "europe",
  "americas",
  "asia",
  "oceania",
];

export interface CountrySwitcherProps {
  initialCountry?: string;
  className?: string;
}

function formatCountryDisplay(
  item: CountryOption,
  locale: "fr" | "en",
  globalLabel: string,
): string {
  if (item.code === "GLOBAL") {
    return globalLabel;
  }
  const localized = locale === "en" ? item.nameEn : item.nameFr;
  if (localized) return localized;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(item.code) ?? item.code;
  } catch {
    return item.code;
  }
}

function CountrySwitcherView({
  country,
  options,
  onChange,
  className,
}: {
  country: string;
  options: readonly CountryOption[];
  onChange: (nextCode: string) => void;
  className?: string;
}) {
  const locale = useLocale() === "en" ? "en" : "fr";
  const tControls = useTranslations("controls");
  const tContinents = useTranslations("continents");
  const tCountries = useTranslations("countries");
  const globalLabel = tCountries("GLOBAL");
  const [open, setOpen] = React.useState(false);

  const selectedItem =
    options.find((c) => c.code === country) ??
    ({
      code: country,
      continent: "global",
      currency: "EUR",
      defaultLocale: locale,
    } satisfies CountryOption);

  const globalItem = options.find((c) => c.code === "GLOBAL") ?? COUNTRY_OPTIONS[0]!;
  const nonGlobal = open ? options.filter((c) => c.code !== "GLOBAL") : [];
  const priorityItems = open
    ? nonGlobal.filter((c) => getBettingPriorityTier(c.code) <= 2).sort(compareByBettingPriority)
    : [];
  const priorityCodes = new Set(priorityItems.map((c) => c.code));
  const remainingItems = open ? nonGlobal.filter((c) => !priorityCodes.has(c.code)) : [];

  return (
    <Select value={country} onValueChange={onChange} open={open} onOpenChange={setOpen}>
      <SelectTrigger
        aria-label={tControls("countryLabel")}
        className={cn("h-9 min-w-[10rem] max-w-[14.5rem] whitespace-nowrap", className)}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5 overflow-hidden">
          <Globe className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
          <span className="truncate">
            <SelectValue />
          </span>
        </span>
      </SelectTrigger>
      <SelectContent className="max-h-96">
        {!open ? (
          <SelectItem value={selectedItem.code}>
            {formatCountryDisplay(selectedItem, locale, globalLabel)} ({selectedItem.currency})
          </SelectItem>
        ) : (
          <>
            <SelectGroup>
              <SelectLabel>{tContinents("global")}</SelectLabel>
              <SelectItem value={globalItem.code}>
                {formatCountryDisplay(globalItem, locale, globalLabel)} ({globalItem.currency})
              </SelectItem>
            </SelectGroup>

            {priorityItems.length > 0 ? (
              <SelectGroup>
                <SelectLabel>
                  {locale === "en" ? "Top Sports Betting & Gaming" : "Top Paris Sportifs & Gaming"}
                </SelectLabel>
                {priorityItems.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {formatCountryDisplay(item, locale, globalLabel)} ({item.currency})
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}

            {CONTINENT_ORDER.map((continent) => {
              const items = remainingItems.filter((item) => item.continent === continent);
              if (items.length === 0) return null;
              return (
                <SelectGroup key={continent}>
                  <SelectLabel>{tContinents(continent)}</SelectLabel>
                  {items.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {formatCountryDisplay(item, locale, globalLabel)} ({item.currency})
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </>
        )}
      </SelectContent>
    </Select>
  );
}

function CountrySwitcherWithQuery({
  initialCountry = DEFAULT_COUNTRY_CODE,
  className,
}: CountrySwitcherProps) {
  const locale = useLocale() === "en" ? "en" : "fr";
  const tControls = useTranslations("controls");
  const tCountries = useTranslations("countries");
  const globalLabel = tCountries("GLOBAL");
  const { pushToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dbOptions = usePublicCountries();
  const options = dbOptions ?? COUNTRY_OPTIONS;

  const [country, setCountry] = React.useState(() => normalizeCountryCode(initialCountry));
  const paysParam = searchParams?.get("pays");
  const activeCountry = paysParam ? normalizeCountryCode(paysParam) : country;

  function handleChange(nextCode: string) {
    const normalized = normalizeCountryCode(nextCode);
    setCountry(normalized);
    if (typeof document !== "undefined") {
      document.cookie = `${COUNTRY_COOKIE_NAME}=${normalized}; Path=/; Max-Age=31536000; SameSite=Lax`;
      const params = new URLSearchParams(window.location.search);
      if (params.has("pays")) {
        params.delete("pays");
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      } else {
        router.refresh();
      }
    } else {
      router.refresh();
    }
    const chosen = options.find((o) => o.code === normalized) ?? {
      code: normalized,
      continent: "global" as const,
      currency: "EUR",
      defaultLocale: locale as "fr" | "en",
    };
    pushToast({
      title: tControls("countryUpdated", {
        country: formatCountryDisplay(chosen, locale, globalLabel),
      }),
      tone: "info",
    });
  }

  return (
    <CountrySwitcherView
      country={activeCountry}
      options={options}
      onChange={handleChange}
      className={className}
    />
  );
}

export function CountrySwitcher({
  initialCountry = DEFAULT_COUNTRY_CODE,
  className,
}: CountrySwitcherProps) {
  const dbOptions = usePublicCountries();
  const options = dbOptions ?? COUNTRY_OPTIONS;
  const fallbackCountry = normalizeCountryCode(initialCountry);

  return (
    <React.Suspense
      fallback={
        <CountrySwitcherView
          country={fallbackCountry}
          options={options}
          onChange={() => {}}
          className={className}
        />
      }
    >
      <CountrySwitcherWithQuery initialCountry={initialCountry} className={className} />
    </React.Suspense>
  );
}
