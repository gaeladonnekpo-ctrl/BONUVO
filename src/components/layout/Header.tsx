"use client";

import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CountrySwitcher } from "./CountrySwitcher";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNav } from "./MobileNav";
import { PUBLIC_PRIMARY_LINKS } from "./navigation-links";
import { ThemeToggle } from "./ThemeToggle";

export interface HeaderProps {
  initialCountry?: string;
}

export function Header({ initialCountry }: HeaderProps) {
  const tBrand = useTranslations("brand");
  const tNav = useTranslations("nav");
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="shrink-0 rounded-md focus-visible:outline-2">
          <span className="sr-only">{tBrand("homeAriaLabel")}</span>
          <BrandLogo size="sm" decorative />
        </Link>

        <nav aria-label={tNav("menuTitle")} className="hidden items-center gap-1 lg:flex">
          {PUBLIC_PRIMARY_LINKS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-surface-elevated font-semibold text-fg"
                    : "text-fg-muted hover:bg-surface-elevated hover:text-fg",
                )}
              >
                {tNav(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <CountrySwitcher initialCountry={initialCountry} />
          </div>
          <div className="hidden sm:block">
            <LocaleSwitcher />
          </div>
          <ThemeToggle responsiveLabel />
          <MobileNav initialCountry={initialCountry} />
        </div>
      </div>
    </header>
  );
}
