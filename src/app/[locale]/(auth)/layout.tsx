import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/PublicShell";
import { isDesignShowcaseEnabled } from "@/lib/design/showcase-guard";
import { normalizeCountryCode } from "@/lib/i18n/countries";
import { listActivePublicCountryOptionsRepo } from "@/modules/offers/public-catalog-meta-repo";
import { resolvePublicRequestCountry } from "@/server/geo/request-country";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [detectedCountry, availableCountries] = await Promise.all([
    resolvePublicRequestCountry(),
    listActivePublicCountryOptionsRepo(),
  ]);

  return (
    <PublicShell
      initialCountry={normalizeCountryCode(detectedCountry)}
      availableCountries={availableCountries}
      showDevDesignLink={isDesignShowcaseEnabled()}
    >
      {children}
    </PublicShell>
  );
}
