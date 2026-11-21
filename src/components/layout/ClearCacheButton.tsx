"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clearApplicationCache } from "@/lib/cache/app-cache";

export function ClearCacheButton({
  locale = "fr",
  compact = false,
}: {
  locale?: string;
  compact?: boolean;
}) {
  const isEn = locale === "en";
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [doneMessage, setDoneMessage] = React.useState<string | null>(null);

  async function handleConfirmClear() {
    setClearing(true);
    setDoneMessage(null);
    try {
      await clearApplicationCache();
      setConfirming(false);
      setDoneMessage(
        isEn
          ? "Application cache cleared. Your account and preferences are intact."
          : "Cache applicatif vidé. Votre session et vos préférences sont conservées.",
      );
      router.refresh();
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-2">
      {!confirming ? (
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "md"}
          onClick={() => {
            setDoneMessage(null);
            setConfirming(true);
          }}
          className="gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          <span>{isEn ? "Clear cache" : "Vider le cache"}</span>
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-subtle p-2.5 text-xs">
          <span className="text-fg-muted">
            {isEn
              ? "Clear temporary app cache? (Your login and preferences remain safe.)"
              : "Vider le cache temporaire ? (Votre connexion et vos préférences restent intactes.)"}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={clearing}
              onClick={() => void handleConfirmClear()}
              className="h-7 px-2.5 text-xs"
            >
              {clearing ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
                  {isEn ? "Clearing..." : "Nettoyage..."}
                </>
              ) : isEn ? (
                "Confirm"
              ) : (
                "Confirmer"
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={clearing}
              onClick={() => setConfirming(false)}
              className="h-7 px-2 text-xs"
            >
              {isEn ? "Cancel" : "Annuler"}
            </Button>
          </div>
        </div>
      )}

      {doneMessage ? (
        <p
          role="status"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-trust"
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{doneMessage}</span>
        </p>
      ) : null}
    </div>
  );
}
