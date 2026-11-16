"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Recoverable error block without leaking internal details.
 */
export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-danger/40 bg-danger-soft p-6 text-center sm:p-8",
        className,
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="font-display text-base font-bold text-fg">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-fg-muted">{description}</p>
      {onRetry && retryLabel ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>{retryLabel}</span>
        </Button>
      ) : null}
    </div>
  );
}
