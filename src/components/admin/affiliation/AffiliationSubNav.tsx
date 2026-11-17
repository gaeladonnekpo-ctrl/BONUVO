"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const SUB_TABS = [
  { href: "/admin/affiliation", label: "Réseaux & liens" },
  { href: "/admin/campagnes", label: "Campagnes UTM" },
  { href: "/admin/postbacks", label: "Postbacks bruts" },
  { href: "/admin/conversions", label: "Conversions" },
  { href: "/admin/commissions", label: "Commissions" },
  { href: "/admin/imports", label: "Imports CSV" },
] as const;

export function AffiliationSubNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation affiliation"
      className="flex flex-wrap gap-1.5 border-b border-border pb-3"
    >
      {SUB_TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "bg-accent text-accent-fg"
                : "border border-border bg-surface text-fg-muted hover:text-fg",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
