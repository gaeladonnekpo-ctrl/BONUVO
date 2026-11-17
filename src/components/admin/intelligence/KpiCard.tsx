"use client";

import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  badgeText?: string;
}

export function KpiCard({ label, value, hint, href, badgeText }: KpiCardProps) {
  const inner = (
    <Card className="h-full transition-colors hover:border-accent/50">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1.5">
        <CardTitle className="text-xs font-medium text-fg-muted">{label}</CardTitle>
        {badgeText ? (
          <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[11px] font-semibold text-accent">
            {badgeText}
          </span>
        ) : href ? (
          <ArrowUpRight className="h-3.5 w-3.5 text-fg-muted" aria-hidden="true" />
        ) : null}
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          {value}
        </div>
        {hint ? <p className="text-xs text-fg-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}
