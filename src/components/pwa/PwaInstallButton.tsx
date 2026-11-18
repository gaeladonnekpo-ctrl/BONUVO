"use client";

import { Download, Share } from "lucide-react";
import * as React from "react";
import { usePwaInstall } from "./PwaInstallProvider";

export function PwaInstallButton({ locale = "fr" }: { locale?: string }) {
  const isFr = locale !== "en";
  const { canPromptInstall, isIosSafari, isStandalone, promptInstall } = usePwaInstall();
  const [showIosGuide, setShowIosGuide] = React.useState(false);

  if (isStandalone || (!canPromptInstall && !isIosSafari)) {
    return null;
  }

  if (canPromptInstall) {
    return (
      <button
        type="button"
        onClick={() => void promptInstall()}
        className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-fg transition hover:bg-accent/20"
      >
        <Download className="h-4 w-4 text-accent" aria-hidden="true" />
        <span>{isFr ? "Installer l'application" : "Install app"}</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setShowIosGuide((prev) => !prev)}
        className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-fg transition hover:bg-accent/20"
      >
        <Share className="h-4 w-4 text-accent" aria-hidden="true" />
        <span>{isFr ? "Ajouter à l'écran d'accueil" : "Add to Home Screen"}</span>
      </button>
      {showIosGuide ? (
        <p className="rounded-xl border border-border bg-surface-subtle p-2.5 text-[11px] leading-relaxed text-fg-muted">
          {isFr
            ? "Dans Safari, touchez l'icône Partager puis « Sur l'écran d'accueil » pour installer BONUVO."
            : 'In Safari, tap the Share icon then "Add to Home Screen" to install BONUVO.'}
        </p>
      ) : null}
    </div>
  );
}
