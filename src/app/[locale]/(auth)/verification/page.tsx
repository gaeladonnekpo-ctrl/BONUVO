import { setRequestLocale } from "next-intl/server";
import { VerificationForm } from "@/components/auth/AuthRecoveryForms";

export default async function VerificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  return <VerificationForm initialError={query.error} />;
}
