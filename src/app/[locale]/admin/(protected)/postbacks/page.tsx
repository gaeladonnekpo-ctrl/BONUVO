import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AffiliationSubNav } from "@/components/admin/affiliation/AffiliationSubNav";
import { EventInspector } from "@/components/admin/affiliation/EventInspector";
import { listPhase5AdminWorkspace } from "@/modules/affiliation/commission-service";
import { requireAdminAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminPostbacksPage({
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
        title="Postbacks et webhooks bruts"
        description="Journaux bruts enregistrés avant attribution, avec outil de rejeu sécurisé."
      />
      <AffiliationSubNav />
      <EventInspector
        events={data.postbacks.map((e) => ({
          id: e.id,
          networkSlug: e.networkSlug,
          sourceType: e.sourceType,
          externalEventId: e.externalEventId,
          signatureValid: e.signatureValid,
          processingStatus: e.processingStatus,
          rejectionReason: e.rejectionReason,
          rawQuery: e.rawQuery,
          rawBody: e.rawBody,
          createdAtIso: e.createdAt.toISOString(),
        }))}
        canReplay={can(actor, "conversions.manage")}
      />
    </div>
  );
}
