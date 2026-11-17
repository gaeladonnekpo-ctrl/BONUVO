import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AffiliationSubNav } from "@/components/admin/affiliation/AffiliationSubNav";
import { ConversionsView } from "@/components/admin/affiliation/ConversionsView";
import { listPhase5AdminWorkspace } from "@/modules/affiliation/commission-service";
import { requireAdminAccess } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminConversionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "stats.read");
  const data = await listPhase5AdminWorkspace(actor);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Conversions déclarées"
        description="Quatre faits distincts sans extrapolation : clic (BONUVO), inscription, premier dépôt (FTD) et commission."
      />
      <AffiliationSubNav />
      <ConversionsView
        clicksCount={data.recentClicks.filter((c) => !c.isBot && !c.isSuspect).length}
        pendingCommissionsCount={data.commissions.filter((c) => c.status === "pending").length}
        networks={data.networks.map((n) => ({ name: n.name, trackingMode: n.trackingMode }))}
        conversions={data.conversions.map((c) => ({
          id: c.id,
          bookmakerName: c.bookmakerName,
          conversionType: c.conversionType,
          attributionMode: c.attributionMode,
          source: c.source,
          status: c.status,
          amount: c.amount,
          currencyCode: c.currencyCode,
          publicClickId: c.publicClickId,
          externalEventId: c.externalEventId,
          occurredAtIso: c.occurredAt.toISOString(),
        }))}
      />
    </div>
  );
}
