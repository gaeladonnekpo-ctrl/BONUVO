"use client";

import { AlertTriangle, MessageCircle, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CommunityChannelLink, DataComponentState } from "./types";

const ALLOWED_COMMUNITY_HOSTS = new Set(["t.me", "whatsapp.com", "chat.whatsapp.com", "wa.me"]);

export function isAllowedCommunityUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "https:" && ALLOWED_COMMUNITY_HOSTS.has(parsed.hostname);
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
 * Floating or inline Telegram/WhatsApp community triggers with strict domain allowlisting.
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
            <button type="button" onClick={onRetry} className="underline cursor-pointer">
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

  return (
    <aside aria-label={t("groupLabel")} className={wrapperClass}>
      {validChannels.map((channel) => {
        const Icon = channel.platform === "telegram" ? Send : MessageCircle;
        if (channel.isDevExample) {
          return (
            <Button
              key={channel.id}
              variant="secondary"
              size="sm"
              disabled
              className="rounded-full"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{channel.label}</span>
            </Button>
          );
        }
        return (
          <Button key={channel.id} asChild variant="secondary" size="sm" className="rounded-full">
            <a href={channel.href} target="_blank" rel="noopener noreferrer">
              <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>{channel.label}</span>
            </a>
          </Button>
        );
      })}
    </aside>
  );
}
