import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { CommunityFab } from "@/components/business/CommunityFab";
import { Footer } from "./Footer";
import { Header } from "./Header";

export interface PublicShellProps {
  children: ReactNode;
  initialCountry?: string;
  showDevDesignLink?: boolean;
}

/**
 * Primary public BONUVO shell: sticky header, skip link, main content, community trigger, footer.
 */
export function PublicShell({
  children,
  initialCountry,
  showDevDesignLink = false,
}: PublicShellProps) {
  const tNav = useTranslations("nav");

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-fg"
      >
        {tNav("skipToContent")}
      </a>
      <Header initialCountry={initialCountry} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <CommunityFab mode="floating" state="empty" />
      <Footer showDevDesignLink={showDevDesignLink} />
    </div>
  );
}
