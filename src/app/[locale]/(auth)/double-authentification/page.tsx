import { setRequestLocale } from "next-intl/server";
import { TotpForm } from "@/components/auth/TotpForm";
import { createSupabaseServerClient } from "@/server/auth/supabase";

export const dynamic = "force-dynamic";

export default async function DoubleAuthenticationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  let initialFactorId: string | null = null;
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedTotp = factors?.totp.find((factor) => factor.status === "verified");
      initialFactorId = verifiedTotp?.id ?? null;
    }
  }

  return <TotpForm initialFactorId={initialFactorId} nextPath={query.next} />;
}
