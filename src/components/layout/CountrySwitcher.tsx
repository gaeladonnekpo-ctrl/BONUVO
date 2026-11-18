"use client";

import { ChevronDown, Globe } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast";
import {
  COUNTRY_COOKIE_NAME,
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY_CODE,
  normalizeCountryCode,
  type CountryOption,
} from "@/lib/i18n/countries";
import { cn } from "@/lib/utils";
import { CountrySwitcherModal, formatCountryDisplay } from "./CountrySwitcherModal";
import { usePublicCountries } from "./public-countries-context";

export interface CountrySwitcherProps {
  initialCountry?: string;
  className?: string;
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
  const tCountries = useTranslations("countries");
  const globalLabel = tCountries("GLOBAL");
  const [open, setOpen] = React.useState(false);
  const listboxId = React.useId();

  const selectedItem =
    options.find((c) => c.code === country) ??
    ({
      code: country,
      continent: "global",
      currency: "EUR",
      defaultLocale: locale,
    } satisfies CountryOption);

  return (
    <>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-label={tControls("countryLabel")}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-9 min-w-[10rem] max-w-[14.5rem] cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-1.5 text-sm text-fg transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          className,
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5 overflow-hidden">
          <Globe className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
          <span className="truncate whitespace-nowrap">
            {formatCountryDisplay(selectedItem, locale, globalLabel)} ({selectedItem.currency})
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
      </button>

      <CountrySwitcherModal
        open={open}
        listboxId={listboxId}
        country={country}
        locale={locale}
        options={options}
        onClose={() => setOpen(false)}
        onSelect={(code) => {
          setOpen(false);
          onChange(code);
        }}
      />
    </>
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

  const [selectedOverride, setSelectedOverride] = React.useState<{
    base: string;
    chosen: string;
  } | null>(null);

  const normalizedInitial = normalizeCountryCode(initialCountry);
  const paysParam = searchParams?.get("pays");
  const activeCountry = paysParam
    ? normalizeCountryCode(paysParam)
    : selectedOverride && selectedOverride.base === normalizedInitial
      ? selectedOverride.chosen
      : normalizedInitial;

  function handleChange(nextCode: string) {
    const normalized = normalizeCountryCode(nextCode);
    setSelectedOverride({ base: normalizedInitial, chosen: normalized });
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
