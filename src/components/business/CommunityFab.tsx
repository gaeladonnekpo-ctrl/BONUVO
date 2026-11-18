"use client";

import { AlertTriangle, ExternalLink, MessageCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { SocialBrandIcon } from "@/components/community/SocialBrandIcon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CommunityChannelLink, DataComponentState } from "./types";

const ALLOWED_COMMUNITY_HOSTS = new Set([
  "t.me",
  "www.t.me",
  "telegram.me",
  "www.telegram.me",
  "whatsapp.com",
  "www.whatsapp.com",
  "chat.whatsapp.com",
  "wa.me",
  "www.wa.me",
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "fb.com",
  "www.fb.com",
]);

export function isAllowedCommunityUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return (
      parsed.protocol === "https:" && ALLOWED_COMMUNITY_HOSTS.has(parsed.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

export interface CommunityFabProps {
  channels?: readonly CommunityChannelLink[];
  state?: DataComponentState;
  mode?: "floating" | "inline";
  onRetry?: () => void;
  className?: string;
}

/**
 * Floating or inline Telegram/WhatsApp/Facebook community triggers with official brand logos.
 */
export function CommunityFab({
  channels = [],
  state = channels.length === 0 ? "empty" : "content",
  mode = "floating",
  onRetry,
  className,
}: CommunityFabProps) {
  const t = useTranslations("communityFab");
  const tStates = useTranslations("states");
  const [showNotice, setShowNotice] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const wrapperClass =
    mode === "floating"
      ? cn(
          "fixed right-3 bottom-4 z-40 flex flex-col items-end gap-2 sm:right-5 sm:bottom-5",
          className,
        )
      : cn("inline-flex flex-wrap items-center gap-2", className);

  if (state === "loading") {
    return (
      <div className={wrapperClass} aria-label={t("groupLabel")}>
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className={wrapperClass} role="alert">
        <div className="inline-flex items-center gap-2 rounded-full border border-danger/40 bg-surface px-3 py-2 text-xs text-danger shadow-[var(--shadow-floating)]">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{tStates("errorDefaultTitle")}</span>
          {onRetry ? (
            <button type="button" onClick={onRetry} className="cursor-pointer underline">
              {tStates("retry")}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const validChannels = channels.filter((c) => c.isDevExample || isAllowedCommunityUrl(c.href));

  if (state === "empty" || validChannels.length === 0) {
    return (
      <aside aria-label={t("groupLabel")} className={wrapperClass}>
        {showNotice ? (
          <p
            role="status"
            className="max-w-64 rounded-card border border-border-strong bg-surface px-3 py-2 text-xs text-fg shadow-[var(--shadow-floating)]"
          >
            {t("unconfigured")}
          </p>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowNotice((prev) => !prev)}
          aria-expanded={showNotice}
          className="rounded-full shadow-[var(--shadow-floating)]"
        >
          <MessageCircle className="h-4 w-4 text-accent" aria-hidden="true" />
          <span>{t("groupLabel")}</span>
        </Button>
      </aside>
    );
  }

  if (mode === "floating") {
    return (
      <aside aria-label={t("groupLabel")} className={wrapperClass}>
        {expanded ? (
          <div className="flex flex-col items-end gap-2 rounded-2xl border border-border bg-surface p-2.5 shadow-[var(--shadow-floating)]">
            {validChannels.map((channel) => (
              <a
                key={channel.id}
                href={channel.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 w-full items-center justify-between gap-2.5 rounded-xl border border-border bg-surface-subtle px-3.5 py-2 text-xs font-semibold text-fg transition hover:border-accent/40 hover:bg-surface-elevated"
              >
                <span className="inline-flex items-center gap-2">
                  <SocialBrandIcon platform={channel.platform} className="size-4 shrink-0" />
                  <span>{channel.label}</span>
                </span>
                <ExternalLink className="size-3.5 text-fg-muted" aria-hidden="true" />
              </a>
            ))}
          </div>
        ) : null}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="rounded-full shadow-[var(--shadow-floating)]"
        >
          {expanded ? (
            <X className="h-4 w-4 text-accent" aria-hidden="true" />
          ) : (
            <span className="inline-flex items-center -space-x-1">
              <SocialBrandIcon platform="telegram" className="size-4" />
              <SocialBrandIcon platform="whatsapp" className="size-4" />
              <SocialBrandIcon platform="facebook" className="size-4" />
            </span>
          )}
          <span>{t("groupLabel")}</span>
        </Button>
      </aside>
    );
  }

  return (
    <aside aria-label={t("groupLabel")} className={wrapperClass}>
      {validChannels.map((channel) => {
        if (channel.isDevExample) {
          return (
            <Button
              key={channel.id}
              variant="secondary"
              size="sm"
              disabled
              className="rounded-full"
            >
              <SocialBrandIcon platform={channel.platform} className="size-4 shrink-0" />
              <span>{channel.label}</span>
            </Button>
          );
        }

        return (
          <Button
            key={channel.id}
            asChild
            variant="secondary"
            size="sm"
            className="rounded-full shadow-[var(--shadow-floating)]"
          >
            <a href={channel.href} target="_blank" rel="noopener noreferrer">
              <SocialBrandIcon platform={channel.platform} className="size-4 shrink-0" />
              <span>{channel.label}</span>
            </a>
          </Button>
        );
      })}
    </aside>
  );
}
