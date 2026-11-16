"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export type ToastTone = "info" | "trust" | "warning" | "danger";

export interface ToastItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly tone?: ToastTone;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastItem, "id">) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const TONE_CLASSES: Record<ToastTone, string> = {
  info: "border-border-strong bg-surface text-fg",
  trust: "border-trust/50 bg-surface text-fg",
  warning: "border-warning/50 bg-surface text-fg",
  danger: "border-danger/50 bg-surface text-fg",
};

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "trust") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-trust" aria-hidden="true" />;
  }
  if (tone === "warning" || tone === "danger") {
    return (
      <AlertTriangle
        className={cn("h-4 w-4 shrink-0", tone === "warning" ? "text-warning" : "text-danger")}
        aria-hidden="true"
      />
    );
  }
  return <Info className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />;
}

export function ToastProvider({
  children,
  dismissLabel = "Close notification",
}: {
  children: React.ReactNode;
  dismissLabel?: string;
}) {
  const [toasts, setToasts] = React.useState<readonly ToastItem[]>([]);
  const timersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = React.useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = React.useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      const timer = setTimeout(() => {
        dismissToast(id);
      }, 4000);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismissToast],
  );

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ pushToast, dismissToast }), [pushToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions text"
        className="pointer-events-none fixed right-3 bottom-4 left-3 z-50 flex flex-col items-end gap-2 sm:right-5 sm:left-auto sm:w-full sm:max-w-sm"
      >
        {toasts.map((item) => {
          const tone = item.tone ?? "info";
          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                "pointer-events-auto flex w-full items-start gap-3 rounded-card border p-3.5 shadow-[var(--shadow-floating)]",
                TONE_CLASSES[tone],
              )}
            >
              <ToastIcon tone={tone} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs text-fg-muted">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label={dismissLabel}
                onClick={() => dismissToast(item.id)}
                className="rounded-md p-1 text-fg-muted hover:bg-surface-elevated hover:text-fg cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      pushToast: () => "",
      dismissToast: () => {},
    };
  }
  return ctx;
}
