import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/PublicShell";
import { isDesignShowcaseEnabled } from "@/lib/design/showcase-guard";
import { normalizeCountryCode } from "@/lib/i18n/countries";
import { resolvePublicRequestCountry } from "@/server/geo/request-country";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const detectedCountry = await resolvePublicRequestCountry();

  return (
    <PublicShell
      initialCountry={normalizeCountryCode(detectedCountry)}
      showDevDesignLink={isDesignShowcaseEnabled()}
    >
      {children}
    </PublicShell>
  );
}
