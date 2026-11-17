import type { Metadata } from "next";
import { CommunityAdminView } from "@/components/community/CommunityAdminView";
import { listAdminCommunityOverview } from "@/modules/community/service";
import { requireAdminAccess } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administration Communauté — BONUVO",
  robots: { index: false, follow: false },
};

export default async function AdminCommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const actor = await requireAdminAccess(locale, "community.manage");
  const { channels, coupons } = await listAdminCommunityOverview(actor.id);

  return <CommunityAdminView locale={locale} channels={channels} coupons={coupons} />;
}
