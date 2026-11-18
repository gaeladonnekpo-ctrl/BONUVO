import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { MemberShell } from "@/components/layout/MemberShell";
import { listActivePublicCountryOptionsRepo } from "@/modules/offers/public-catalog-meta-repo";
import { requireEmailVerified } from "@/server/auth/guards";
import { resolvePublicRequestCountry } from "@/server/geo/request-country";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MemberAccountLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const [user, detectedCountry, availableCountries] = await Promise.all([
    requireEmailVerified(locale),
    resolvePublicRequestCountry(),
    listActivePublicCountryOptionsRepo(),
  ]);
  const t = await getTranslations("auth.protected");
  const effectiveCountry =
    detectedCountry && detectedCountry !== "GLOBAL" ? detectedCountry : user.countryCode;

  return (
    <MemberShell
      navAriaLabel={t("memberNavAria")}
      navItems={[{ id: "overview", label: t("memberNavOverview"), href: `/${locale}/compte` }]}
      initialCountry={effectiveCountry}
      availableCountries={availableCountries}
      currentUser={{ displayName: user.displayName, email: user.email }}
    >
      {children}
    </MemberShell>
  );
}
