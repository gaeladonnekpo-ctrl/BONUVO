import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { ThemeProvider, type AppTheme } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { routing } from "@/i18n/routing";
import { FONT_VARIABLES_CLASS } from "@/lib/fonts";
import { THEME_COOKIE_NAME } from "@/lib/i18n/countries";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const cookieStore = await cookies();
  const rawTheme = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const initialTheme: AppTheme = rawTheme === "light" ? "light" : "dark";
  const dismissLabel = locale === "en" ? "Close notification" : "Fermer la notification";

  return (
    <html
      lang={locale}
      className={`${initialTheme} ${FONT_VARIABLES_CLASS}`}
      data-theme={initialTheme}
    >
      <body className="min-h-screen bg-bg text-fg antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider initialTheme={initialTheme}>
            <TooltipProvider>
              <ToastProvider dismissLabel={dismissLabel}>{children}</ToastProvider>
            </TooltipProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
