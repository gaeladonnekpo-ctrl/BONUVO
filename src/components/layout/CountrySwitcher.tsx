"use client";

import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
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
import {
  COUNTRY_COOKIE_NAME,
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY_CODE,
  normalizeCountryCode,
  type ContinentKey,
} from "@/lib/i18n/countries";
import { cn } from "@/lib/utils";

const CONTINENT_ORDER: readonly ContinentKey[] = [
  "global",
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

export function CountrySwitcher({
  initialCountry = DEFAULT_COUNTRY_CODE,
  className,
}: CountrySwitcherProps) {
  const tControls = useTranslations("controls");
  const tContinents = useTranslations("continents");
  const tCountries = useTranslations("countries");
  const { pushToast } = useToast();
  const [country, setCountry] = React.useState(() => normalizeCountryCode(initialCountry));

  function handleChange(nextCode: string) {
    const normalized = normalizeCountryCode(nextCode);
    setCountry(normalized);
    if (typeof document !== "undefined") {
      document.cookie = `${COUNTRY_COOKIE_NAME}=${normalized}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
    pushToast({
      title: tControls("countryUpdated", { country: tCountries(normalized) }),
      tone: "info",
    });
  }

  return (
    <Select value={country} onValueChange={handleChange}>
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
      <SelectContent>
        {CONTINENT_ORDER.map((continent) => {
          const items = COUNTRY_OPTIONS.filter((item) => item.continent === continent);
          if (items.length === 0) {
            return null;
          }
          return (
            <SelectGroup key={continent}>
              <SelectLabel>{tContinents(continent)}</SelectLabel>
              {items.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {tCountries(item.code)} ({item.currency})
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
