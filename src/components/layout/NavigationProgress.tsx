"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Instant top progress bar triggered immediately when clicking internal navigation links,
 * giving immediate visual feedback while Next.js streams the destination segment.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRouteKey = React.useMemo(() => {
    const qs = searchParams?.toString() ?? "";
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const [navigatingFrom, setNavigatingFrom] = React.useState<string | null>(null);
  const currentRouteRef = React.useRef(currentRouteKey);

  React.useEffect(() => {
    currentRouteRef.current = currentRouteKey;
  }, [currentRouteKey]);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      try {
        const dest = new URL(anchor.href, window.location.href);
        if (dest.origin !== window.location.origin) return;
        if (dest.pathname === window.location.pathname && dest.search === window.location.search) {
          return;
        }
        setNavigatingFrom(currentRouteRef.current);
      } catch {
        // Ignore malformed URLs
      }
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const navigating = navigatingFrom !== null && navigatingFrom === currentRouteKey;

  if (!navigating) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-accent/20"
    >
      <div className="h-full w-2/3 animate-pulse bg-gradient-to-r from-accent via-trust to-accent" />
    </div>
  );
}
