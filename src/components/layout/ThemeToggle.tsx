"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";

export interface ThemeToggleProps {
  compact?: boolean;
  responsiveLabel?: boolean;
  className?: string;
}

export function ThemeToggle({
  compact = false,
  responsiveLabel = false,
  className,
}: ThemeToggleProps) {
  const t = useTranslations("controls");
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const actionLabel = isDark ? t("switchToLight") : t("switchToDark");

  const modeLabel = isDark ? t("darkMode") : t("lightMode");

  return (
    <Button
      variant="outline"
      size={compact ? "icon" : "sm"}
      onClick={toggleTheme}
      aria-pressed={!isDark}
      title={actionLabel}
      className={className}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-accent" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-accent" aria-hidden="true" />
      )}
      {!compact ? (
        <span className={responsiveLabel ? "sr-only md:not-sr-only" : undefined}>{modeLabel}</span>
      ) : (
        <span className="sr-only">{modeLabel}</span>
      )}
      <span className="sr-only"> — {actionLabel}</span>
    </Button>
  );
}
