import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { isDesignShowcaseEnabled } from "@/lib/design/showcase-guard";
import { requireAdminAccess } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const reqHeaders = await headers();
  const showcaseHeader = reqHeaders.get("x-bonuvo-dev-showcase") === "1";
  const allowDevShowcase = showcaseHeader && isDesignShowcaseEnabled();

  if (!allowDevShowcase) {
    await requireAdminAccess(locale);
  }

  return <AdminShell showDevDesignLink={isDesignShowcaseEnabled()}>{children}</AdminShell>;
}
