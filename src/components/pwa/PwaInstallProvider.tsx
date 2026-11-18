"use client";

import * as React from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaInstallContextValue {
  canPromptInstall: boolean;
  isIosSafari: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

const PwaInstallContext = React.createContext<PwaInstallContextValue>({
  canPromptInstall: false,
  isIosSafari: false,
  isStandalone: false,
  promptInstall: async () => "unavailable",
});

export function usePwaInstall() {
  return React.useContext(PwaInstallContext);
}

const emptySubscribe = () => () => {};

function getClientStandaloneSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function getClientIosSafariSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios|chrome/.test(ua);
  return isIos && isSafari && !getClientStandaloneSnapshot();
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installedNow, setInstalledNow] = React.useState(false);

  const isStandaloneSnapshot = React.useSyncExternalStore(
    emptySubscribe,
    getClientStandaloneSnapshot,
    () => false,
  );
  const isIosSafari = React.useSyncExternalStore(
    emptySubscribe,
    getClientIosSafariSnapshot,
    () => false,
  );
  const isStandalone = isStandaloneSnapshot || installedNow;

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setInstalledNow(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
              registration.update().catch(() => {});
            }
          });
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    if (!deferredPrompt) return "unavailable" as const;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
    return choice.outcome;
  }, [deferredPrompt]);

  const value = React.useMemo<PwaInstallContextValue>(
    () => ({
      canPromptInstall: Boolean(deferredPrompt) && !isStandalone,
      isIosSafari,
      isStandalone,
      promptInstall,
    }),
    [deferredPrompt, isIosSafari, isStandalone, promptInstall],
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}
