import type { Metadata } from "next";
import { ContentAdminView } from "@/components/community/ContentAdminView";
import { listAdminCommunityOverview } from "@/modules/community/service";
import { requireAdminAccess } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administration Contenus — BONUVO",
  robots: { index: false, follow: false },
};

export default async function AdminContentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const actor = await requireAdminAccess(locale, "content.write");
  const { posts } = await listAdminCommunityOverview(actor.id);

  return <ContentAdminView locale={locale} posts={posts} />;
}
