import { setRequestLocale } from "next-intl/server";
import { AiSubNav } from "@/components/admin/ai/AiSubNav";
import { IngestionAdminView } from "@/components/admin/ai/IngestionAdminView";
import { getAdminIngestionOverview } from "@/modules/ai/service/admin-ai-service";
import { requireAdminAccess } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminIngestionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "predictions.manage");
  const overview = await getAdminIngestionOverview(actor.id);

  return (
    <div className="space-y-6">
      <AiSubNav />
      <IngestionAdminView
        providerConfigured={overview.providerConfigured}
        llmEnabled={overview.llmEnabled}
        dailyQuotaLimit={overview.provider.dailyQuotaLimit}
        quotaReserve={overview.provider.quotaReserve}
        initialLeagues={overview.leagues}
        runs={overview.runs}
      />
    </div>
  );
}
