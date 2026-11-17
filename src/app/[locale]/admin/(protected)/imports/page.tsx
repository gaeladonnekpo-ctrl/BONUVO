import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AffiliationSubNav } from "@/components/admin/affiliation/AffiliationSubNav";
import { ImportWizard } from "@/components/admin/affiliation/ImportWizard";
import { listPhase5AdminWorkspace } from "@/modules/affiliation/commission-service";
import { requireAdminAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminImportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "conversions.manage");
  const data = await listPhase5AdminWorkspace(actor);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Imports CSV partenaires"
        description="Validation ligne par ligne avec aperçu des rejets avant enregistrement."
      />
      <AffiliationSubNav />
      <ImportWizard
        imports={data.imports.map((i) => ({
          id: i.id,
          filename: i.filename,
          totalRows: i.totalRows,
          acceptedRows: i.acceptedRows,
          rejectedRows: i.rejectedRows,
          status: i.status,
          createdAtIso: i.createdAt.toISOString(),
        }))}
        networks={data.networks.map((n) => ({ id: n.id, name: n.name }))}
        canImport={can(actor, "conversions.manage")}
      />
    </div>
  );
}
