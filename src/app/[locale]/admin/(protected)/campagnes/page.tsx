import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AffiliationSubNav } from "@/components/admin/affiliation/AffiliationSubNav";
import { CampaignsView } from "@/components/admin/affiliation/CampaignsView";
import { listPhase5AdminWorkspace } from "@/modules/affiliation/commission-service";
import { requireAdminAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "offers.read");
  const data = await listPhase5AdminWorkspace(actor);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Campagnes d'affiliation"
        description="Codes UTM (?utm_campaign=...) reliés aux clics /go/[slug]."
      />
      <AffiliationSubNav />
      <CampaignsView
        campaigns={data.campaigns}
        bookmakers={data.bookmakers}
        canManage={can(actor, "links.manage")}
      />
    </div>
  );
}
