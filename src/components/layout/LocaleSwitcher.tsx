"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALES, type AppLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("controls");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  function handleSelect(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      return;
    }
    router.replace(pathname || "/", { locale: nextLocale });
  }

  return (
    <div
      role="group"
      aria-label={t("localeLabel")}
      className={cn(
        "inline-flex h-9 items-center rounded-lg border border-border bg-surface-subtle p-0.5",
        className,
      )}
    >
      {LOCALES.map((item) => {
        const active = item === locale;
        const label = item === "fr" ? t("switchToFr") : t("switchToEn");
        return (
          <button
            key={item}
            type="button"
            onClick={() => handleSelect(item)}
            title={label}
            aria-pressed={active}
            className={cn(
              "inline-flex h-7.5 items-center rounded-md px-2 text-xs font-semibold uppercase transition-colors cursor-pointer",
              active ? "bg-accent text-accent-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            <span>{item}</span>
            <span className="sr-only"> — {label}</span>
          </button>
        );
      })}
    </div>
  );
}
