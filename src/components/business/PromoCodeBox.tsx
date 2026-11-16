"use client";

import { AlertTriangle, Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { DataComponentState } from "./types";

export interface PromoCodeBoxProps {
  code?: string | null;
  validOn?: string;
  state?: DataComponentState;
  onCopy?: (code: string) => void;
  onRetry?: () => void;
  className?: string;
}

/**
 * Dashed promo code display with one-click clipboard action and screen-reader feedback.
 */
export function PromoCodeBox({
  code,
  validOn,
  state = code ? "content" : "empty",
  onCopy,
  onRetry,
  className,
}: PromoCodeBoxProps) {
  const t = useTranslations("offerCard");
  const tStates = useTranslations("states");
  const { pushToast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const [liveMessage, setLiveMessage] = React.useState("");

  React.useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (state === "loading") {
    return <Skeleton className={cn("h-14 w-full rounded-lg", className)} />;
  }

  if (state === "error") {
    return (
      <div
        role="alert"
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2.5 text-xs text-danger",
          className,
        )}
      >
        <span className="inline-flex items-center gap-1.5 font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{tStates("errorDefaultTitle")}</span>
        </span>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {tStates("retry")}
          </Button>
        ) : null}
      </div>
    );
  }

  if (state === "empty" || !code) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border bg-surface-subtle px-3 py-2.5 text-xs text-fg-muted",
          className,
        )}
      >
        {t("promoLabel")} : {tStates("emptyDefaultTitle")}
      </div>
    );
  }

  async function handleCopy() {
    if (!code) {
      return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
      setCopied(true);
      const msg = t("copyAnnouncement", { code });
      setLiveMessage(msg);
      pushToast({ title: t("copiedCode"), description: msg, tone: "trust" });
      onCopy?.(code);
    } catch {
      const failMsg = t("copyFailed");
      setLiveMessage(failMsg);
      pushToast({ title: failMsg, tone: "warning" });
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-dashed border-border-strong bg-surface-subtle px-3.5 py-2.5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wider text-fg-muted uppercase">
          {t("promoLabel")}
        </p>
        <p className="truncate font-mono text-base font-bold tracking-wider text-fg">{code}</p>
        {validOn ? (
          <p className="mt-0.5 text-xs text-fg-muted">{t("validOn", { target: validOn })}</p>
        ) : null}
      </div>
      <Button
        variant={copied ? "trust" : "secondary"}
        size="sm"
        onClick={handleCopy}
        aria-label={`${t("copyCode")} ${code}`}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("copiedCode")}</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("copyCode")}</span>
          </>
        )}
      </Button>
      <span className="sr-only" aria-live="polite">
        {liveMessage}
      </span>
    </div>
  );
}
