"use client";

import { LogIn, UserCheck, UserPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CountrySwitcher } from "./CountrySwitcher";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNav } from "./MobileNav";
import { PUBLIC_PRIMARY_LINKS } from "./navigation-links";
import { ThemeToggle } from "./ThemeToggle";

export interface ShellUserSummary {
  displayName: string;
  email: string;
}

export interface HeaderProps {
  initialCountry?: string;
  currentUser?: ShellUserSummary | null;
}

export function Header({ initialCountry, currentUser }: HeaderProps) {
  const tBrand = useTranslations("brand");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const isFr = locale !== "en";
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

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:block">
            <CountrySwitcher initialCountry={initialCountry} />
          </div>
          <div className="hidden sm:block">
            <LocaleSwitcher />
          </div>
          <ThemeToggle responsiveLabel />
          {currentUser ? (
            <Link
              href="/compte"
              className="inline-flex h-9 max-w-[140px] items-center gap-1.5 rounded-lg border border-trust/40 bg-trust-soft px-2.5 text-xs font-semibold text-fg transition-colors hover:border-trust hover:bg-surface-elevated sm:max-w-[180px]"
            >
              <UserCheck className="h-3.5 w-3.5 shrink-0 text-trust" aria-hidden="true" />
              <span className="truncate">{currentUser.displayName}</span>
            </Link>
          ) : (
            <>
              <Link
                href="/connexion"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:border-accent/50 hover:bg-surface-elevated"
              >
                <LogIn className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                <span>{isFr ? "Connexion" : "Sign in"}</span>
              </Link>
              <Link
                href="/inscription"
                className="hidden h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover md:inline-flex"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isFr ? "S'inscrire" : "Sign up"}</span>
              </Link>
            </>
          )}
          <MobileNav initialCountry={initialCountry} currentUser={currentUser} />
        </div>
      </div>
    </header>
  );
}
