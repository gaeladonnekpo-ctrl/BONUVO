import { useLocale, useTranslations } from "next-intl";
import { Suspense, type ReactNode } from "react";
import { CommunityFab } from "@/components/business/CommunityFab";
import { OFFICIAL_SOCIAL_LINKS } from "@/components/community/SocialBrandIcon";
import type { CountryOption } from "@/lib/i18n/countries";
import { Footer } from "./Footer";
import { Header, type ShellUserSummary } from "./Header";
import { NavigationProgress } from "./NavigationProgress";
import { PublicCountriesProvider } from "./public-countries-context";

export interface PublicShellProps {
  children: ReactNode;
  initialCountry?: string;
  availableCountries?: readonly CountryOption[];
  currentUser?: ShellUserSummary | null;
  showDevDesignLink?: boolean;
}

/**
 * Primary public BONUVO shell: sticky header, skip link, main content, official social community trigger, footer.
 */
export function PublicShell({
  children,
  initialCountry,
  availableCountries,
  currentUser,
  showDevDesignLink = false,
}: PublicShellProps) {
  const tNav = useTranslations("nav");
  const locale = useLocale() === "en" ? "en" : "fr";
  const isFr = locale === "fr";

  const officialFloatingChannels = [
    {
      id: "fab-telegram",
      platform: "telegram" as const,
      href: OFFICIAL_SOCIAL_LINKS.telegram,
      label: isFr ? "Canal Telegram" : "Telegram Channel",
    },
    {
      id: "fab-whatsapp",
      platform: "whatsapp" as const,
      href: OFFICIAL_SOCIAL_LINKS.whatsapp,
      label: isFr ? "Chaîne WhatsApp" : "WhatsApp Channel",
    },
    {
      id: "fab-facebook",
      platform: "facebook" as const,
      href: OFFICIAL_SOCIAL_LINKS.facebook,
      label: isFr ? "Page Facebook" : "Facebook Page",
    },
  ];

  return (
    <PublicCountriesProvider countries={availableCountries}>
      <div className="flex min-h-screen flex-col bg-bg text-fg">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-fg"
        >
          {tNav("skipToContent")}
        </a>
        <Header initialCountry={initialCountry} currentUser={currentUser} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <CommunityFab mode="floating" state="content" channels={officialFloatingChannels} />
        <Footer showDevDesignLink={showDevDesignLink} />
      </div>
    </PublicCountriesProvider>
  );
}
