import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/PublicShell";
import { isDesignShowcaseEnabled } from "@/lib/design/showcase-guard";
import { COUNTRY_COOKIE_NAME, normalizeCountryCode } from "@/lib/i18n/countries";

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
  const cookieStore = await cookies();
  const headerStore = await headers();
  const rawCountry =
    cookieStore.get(COUNTRY_COOKIE_NAME)?.value ??
    headerStore.get("x-vercel-ip-country") ??
    undefined;

  return (
    <PublicShell
      initialCountry={normalizeCountryCode(rawCountry)}
      showDevDesignLink={isDesignShowcaseEnabled()}
    >
      {children}
    </PublicShell>
  );
}
