"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Automatically refreshes the Server Component route every 30 seconds when a match
 * is currently in play or past kickoff without a final score, while the tab is visible.
 */
export function LiveMatchRefresher({
  enabled,
  intervalMs = 30_000,
}: {
  enabled: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();

  React.useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, intervalMs, router]);

  return null;
}
