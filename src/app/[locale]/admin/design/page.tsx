import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DesignShowcaseClient } from "@/components/design/DesignShowcaseClient";
import { isDesignShowcaseEnabled } from "@/lib/design/showcase-guard";

export default async function AdminDesignShowcasePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (!isDesignShowcaseEnabled()) {
    notFound();
  }

  const { locale } = await params;
  setRequestLocale(locale);

  return <DesignShowcaseClient />;
}
