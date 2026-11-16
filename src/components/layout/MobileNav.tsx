"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
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
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label={tNav("openMenu")} className="lg:hidden">
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="top-0 right-0 left-auto h-dvh max-w-xs translate-x-0 translate-y-0 rounded-none rounded-l-2xl border-l p-5">
        <DialogHeader className="border-b border-border pb-4 text-left">
          <DialogTitle>
            <BrandLogo size="sm" />
          </DialogTitle>
          <DialogDescription>{tNav("menuTitle")}</DialogDescription>
        </DialogHeader>

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

        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <CountrySwitcher initialCountry={initialCountry} className="w-full max-w-none" />
          <div className="flex items-center justify-between gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <nav
          aria-label="Trust links"
          className="mt-5 flex flex-col gap-1 border-t border-border pt-4"
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
