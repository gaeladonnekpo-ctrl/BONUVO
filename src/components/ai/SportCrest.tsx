"use client";

import * as React from "react";
import { Shield, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "FC";
  if (words.length === 1) return (words[0] ?? "FC").slice(0, 3).toUpperCase();
  return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
}

const AUTHORIZED_LOGO_HOSTS = new Set(["media.api-sports.io", "a.espncdn.com"]);

/**
 * Allows only site-local paths, configured Supabase storage URLs, or authorized sports CDNs.
 * Any other URL falls back cleanly to a deterministic team monogram / league icon.
 */
export function isAuthorizedSportLogoUrl(url?: string | null): boolean {
  if (!url) return false;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (AUTHORIZED_LOGO_HOSTS.has(parsed.hostname)) return true;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && parsed.hostname === new URL(supabaseUrl).hostname) {
      return parsed.pathname.includes("/storage/v1/object/public/");
    }
    return false;
  } catch {
    return false;
  }
}

export function TeamCrest({
  name,
  logoUrl,
  size = "md",
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const dims =
    size === "lg"
      ? "h-14 w-14 sm:h-16 sm:w-16 text-sm"
      : size === "sm"
        ? "h-7 w-7 text-[10px]"
        : "h-11 w-11 sm:h-12 sm:w-12 text-xs";

  const validLogo = Boolean(!failed && isAuthorizedSportLogoUrl(logoUrl));

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-surface-elevated p-1.5 shadow-xs transition-transform duration-200 group-hover:scale-105",
        dims,
        className,
      )}
    >
      {validLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl!}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="inline-flex flex-col items-center justify-center font-display font-bold tracking-tight text-fg-muted">
          <Shield className="h-3.5 w-3.5 text-accent/80" aria-hidden="true" />
          <span>{getInitials(name)}</span>
        </span>
      )}
    </div>
  );
}

export function LeagueBadge({
  name,
  logoUrl,
  countryName,
  active = false,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  countryName?: string;
  active?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const validLogo = Boolean(!failed && isAuthorizedSportLogoUrl(logoUrl));

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-200",
        active
          ? "border-accent bg-accent text-accent-fg shadow-xs"
          : "border-border bg-surface-elevated/90 text-fg",
        className,
      )}
    >
      {validLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl!}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-4 w-4 shrink-0 rounded-full bg-white p-0.5 object-contain"
        />
      ) : (
        <Trophy className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
      )}
      <span className="truncate">{name}</span>
      {countryName ? (
        <span
          className={cn(
            "hidden text-[10px] sm:inline",
            active ? "text-accent-fg/80" : "text-fg-muted",
          )}
        >
          · {countryName}
        </span>
      ) : null}
    </span>
  );
}
