"use client";

import { LogIn, Menu, UserPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { OFFICIAL_BONUVO_CHANNELS, SocialBrandIcon } from "@/components/community/SocialBrandIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { CountrySwitcher } from "./CountrySwitcher";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { PUBLIC_PRIMARY_LINKS, TRUST_PAGE_LINKS } from "./navigation-links";
import { ThemeToggle } from "./ThemeToggle";

export interface MobileNavProps {
  initialCountry?: string;
}

export function MobileNav({ initialCountry }: MobileNavProps) {
  const tNav = useTranslations("nav");
  const tTrust = useTranslations("trustPages");
  const locale = useLocale();
  const isFr = locale !== "en";
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label={tNav("openMenu")} className="lg:hidden">
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="top-0 right-0 left-auto h-dvh max-w-xs translate-x-0 translate-y-0 overflow-y-auto rounded-none rounded-l-2xl border-l p-5">
        <DialogHeader className="border-b border-border pb-4 text-left">
          <DialogTitle>
            <BrandLogo size="sm" />
          </DialogTitle>
          <DialogDescription>{tNav("menuTitle")}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href="/connexion"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-subtle px-3 py-2 text-xs font-semibold text-fg transition hover:border-accent/40 hover:bg-surface-elevated"
          >
            <LogIn className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span>{isFr ? "Se connecter" : "Sign in"}</span>
          </Link>
          <Link
            href="/inscription"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-fg transition hover:bg-accent-hover"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isFr ? "S'inscrire" : "Sign up"}</span>
          </Link>
        </div>

        <nav aria-label={tNav("menuTitle")} className="mt-4 flex flex-col gap-1">
          {PUBLIC_PRIMARY_LINKS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-surface-elevated"
            >
              {tNav(item.key)}
            </Link>
          ))}
        </nav>

        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">
            {isFr ? "Nos réseaux officiels" : "Official social channels"}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {OFFICIAL_BONUVO_CHANNELS.map((ch) => (
              <a
                key={ch.id}
                href={ch.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-10 items-center gap-2.5 rounded-xl border border-border bg-surface-subtle px-3 py-2 text-xs font-semibold text-fg transition hover:border-accent/40 hover:bg-surface-elevated"
              >
                <SocialBrandIcon platform={ch.platform} className="size-4 shrink-0" />
                <span>{isFr ? ch.labelFr : ch.labelEn}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <CountrySwitcher initialCountry={initialCountry} className="w-full max-w-none" />
          <div className="flex items-center justify-between gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <nav
          aria-label="Trust links"
          className="mt-4 flex flex-col gap-1 border-t border-border pt-4"
        >
          {TRUST_PAGE_LINKS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-fg-muted hover:text-fg"
            >
              {tTrust(`${item.key}.nav`)}
            </Link>
          ))}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
