import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AffiliationSubNav } from "@/components/admin/affiliation/AffiliationSubNav";
import { CommissionsView } from "@/components/admin/affiliation/CommissionsView";
import { listPhase5AdminWorkspace } from "@/modules/affiliation/commission-service";
import { requireAdminAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminCommissionsPage({
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
        title="Commissions et justificatifs"
        description="Cycle pending -> confirmed -> paid / rejected avec historique immuable et preuve partenaire."
      />
      <AffiliationSubNav />
      <CommissionsView
        commissions={data.commissions.map((c) => ({
          id: c.id,
          bookmakerName: c.bookmakerName,
          model: c.model,
          amount: c.amount,
          currencyCode: c.currencyCode,
          status: c.status,
          periodLabel: c.periodLabel,
          proofReference: c.proofReference,
        }))}
        history={data.commissionHistory.map((h) => ({
          id: h.id,
          commissionId: h.commissionId,
          previousStatus: h.previousStatus,
          nextStatus: h.nextStatus,
          proofReference: h.proofReference,
          reason: h.reason,
          createdAtIso: h.createdAt.toISOString(),
        }))}
        canManage={can(actor, "conversions.manage")}
      />
    </div>
  );
}
