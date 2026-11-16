import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { ThemeProvider, type AppTheme } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import enMessages from "../../messages/en.json";
import frMessages from "../../messages/fr.json";

export function TestUiWrapper({
  children,
  locale = "fr",
  initialTheme = "dark",
}: {
  children: ReactNode;
  locale?: "fr" | "en";
  initialTheme?: AppTheme;
}) {
  const messages = locale === "en" ? enMessages : frMessages;
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider initialTheme={initialTheme}>
        <TooltipProvider>
          <ToastProvider>{children}</ToastProvider>
        </TooltipProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
