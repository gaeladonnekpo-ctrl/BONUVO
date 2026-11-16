"use client";

import * as React from "react";
import { THEME_COOKIE_NAME } from "@/lib/i18n/countries";

export type AppTheme = "dark" | "light";

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (nextTheme: AppTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyThemeToDocument(theme: AppTheme) {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function ThemeProvider({
  initialTheme = "dark",
  children,
}: {
  initialTheme?: AppTheme;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = React.useState<AppTheme>(initialTheme);

  const setTheme = React.useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    applyThemeToDocument(nextTheme);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeState((prev) => {
      const next: AppTheme = prev === "dark" ? "light" : "dark";
      applyThemeToDocument(next);
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "dark",
      setTheme: applyThemeToDocument,
      toggleTheme: () => {},
    };
  }
  return ctx;
}
