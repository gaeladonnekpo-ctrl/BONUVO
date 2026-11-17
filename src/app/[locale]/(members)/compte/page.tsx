import type { Metadata } from "next";
import { MemberDashboardView } from "@/components/members/MemberDashboardView";
import { getMemberDashboardData } from "@/modules/members/service";
import { requireEmailVerified } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon compte — BONUVO",
  robots: { index: false, follow: false },
};

export default async function MemberAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireEmailVerified(locale);
  const dashboard = await getMemberDashboardData(user.id);
  const lang: "fr" | "en" = locale === "en" ? "en" : "fr";

  return (
    <MemberDashboardView
      locale={lang}
      user={{
        id: user.id,
        email: user.email,
        roles: user.roles,
      }}
      profile={dashboard.profile}
      preferences={dashboard.preferences}
      consentHistory={dashboard.consentHistory}
      activities={dashboard.activities}
      pendingDeletion={dashboard.pendingDeletion}
      unsubscribeToken={dashboard.unsubscribeToken}
    />
  );
}
