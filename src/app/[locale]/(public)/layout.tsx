import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/PublicShell";
import { normalizeCountryCode } from "@/lib/i18n/countries";
import { listActivePublicCountryOptionsRepo } from "@/modules/offers/public-catalog-meta-repo";
import { getCurrentUser } from "@/server/auth/session";
import { resolvePublicRequestCountry } from "@/server/geo/request-country";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [detectedCountry, availableCountries, user] = await Promise.all([
    resolvePublicRequestCountry(),
    listActivePublicCountryOptionsRepo(),
    getCurrentUser().catch(() => null),
  ]);

  return (
    <PublicShell
      initialCountry={normalizeCountryCode(detectedCountry)}
      availableCountries={availableCountries}
      currentUser={user ? { displayName: user.displayName, email: user.email } : null}
    >
      {children}
    </PublicShell>
  );
}
