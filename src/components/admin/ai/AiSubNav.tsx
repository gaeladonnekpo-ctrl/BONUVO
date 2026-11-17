"use client";

import { DatabaseZap, Sparkles } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin/pronostics", label: "Pronostics & Coupons", icon: Sparkles },
  { href: "/admin/ingestion", label: "Ingestion & Ligues", icon: DatabaseZap },
] as const;

export function AiSubNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation BONUVO AI"
      className="flex flex-wrap items-center gap-2 border-b border-border pb-3"
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-fg"
                : "border border-border bg-surface text-fg-muted hover:text-fg",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
