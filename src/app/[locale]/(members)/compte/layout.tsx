import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { MemberShell } from "@/components/layout/MemberShell";
import { isDesignShowcaseEnabled } from "@/lib/design/showcase-guard";
import { requireEmailVerified } from "@/server/auth/guards";

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
  const user = await requireEmailVerified(locale);
  const t = await getTranslations("auth.protected");

  return (
    <MemberShell
      navAriaLabel={t("memberNavAria")}
      navItems={[{ id: "overview", label: t("memberNavOverview"), href: `/${locale}/compte` }]}
      initialCountry={user.countryCode}
      showDevDesignLink={isDesignShowcaseEnabled()}
    >
      {children}
    </MemberShell>
  );
}
