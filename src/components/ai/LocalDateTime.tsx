"use client";

import * as React from "react";

export interface LocalDateTimeProps {
  iso: string;
  locale?: string;
  variant?: "short" | "full" | "compact";
}

function formatDate(
  iso: string,
  locale: string,
  variant: "short" | "full" | "compact",
  useUtc: boolean,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const isEn = locale === "en";
  const baseOptions: Intl.DateTimeFormatOptions =
    variant === "compact"
      ? {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }
      : variant === "full"
        ? {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          }
        : {
            weekday: "short",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          };

  if (useUtc) {
    baseOptions.timeZone = "UTC";
  }

  return new Intl.DateTimeFormat(isEn ? "en-GB" : "fr-FR", baseOptions).format(date);
}

const emptySubscribe = () => () => {};

/**
 * Formats an ISO-8601 UTC timestamp in the user's actual browser timezone after mount,
 * avoiding server-UTC timezone drift and React hydration mismatches.
 */
export function LocalDateTime({ iso, locale = "fr", variant = "short" }: LocalDateTimeProps) {
  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {formatDate(iso, locale, variant, !isClient)}
    </time>
  );
}
