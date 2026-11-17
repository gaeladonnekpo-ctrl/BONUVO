import { setRequestLocale } from "next-intl/server";
import { AiSubNav } from "@/components/admin/ai/AiSubNav";
import { PredictionsAdminView } from "@/components/admin/ai/PredictionsAdminView";
import { getAdminPredictionsOverview } from "@/modules/ai/service/admin-ai-service";
import { requireAdminAccess } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminPredictionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "predictions.manage");
  const overview = await getAdminPredictionsOverview(actor.id);

  return (
    <div className="space-y-6">
      <AiSubNav />
      <PredictionsAdminView initialItems={overview.items} />
    </div>
  );
}
