"use client";

import * as React from "react";
import { User } from "lucide-react";
import { isAuthorizedSportLogoUrl } from "@/components/ai/SportCrest";
import { cn } from "@/lib/utils";

function getPlayerInitials(name: string): string {
  const parts = name
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "J";
  if (parts.length === 1) return (parts[0] ?? "J").slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

export function PlayerAvatar({
  name,
  photoUrl,
  highlight = false,
  className,
}: {
  name: string;
  photoUrl?: string | null;
  highlight?: boolean;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const failed = Boolean(photoUrl && failedUrl === photoUrl);

  const validPhoto = Boolean(!failed && isAuthorizedSportLogoUrl(photoUrl));

  return (
    <div
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-surface-elevated shadow-xs transition-transform duration-200 group-hover/player:scale-105",
        highlight ? "border-accent/70 ring-2 ring-accent/20" : "border-border/80",
        className,
      )}
    >
      {validPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl!}
          alt={name}
          loading="lazy"
          onError={() => setFailedUrl(photoUrl ?? null)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <span className="inline-flex flex-col items-center justify-center font-display text-[11px] font-bold tracking-tight text-fg-muted">
          <User className="h-3 w-3 text-accent/70" aria-hidden="true" />
          <span>{getPlayerInitials(name)}</span>
        </span>
      )}
    </div>
  );
}
