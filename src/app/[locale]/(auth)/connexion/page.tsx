import { setRequestLocale } from "next-intl/server";
import { SignInForm } from "@/components/auth/AuthCredentialForms";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  return <SignInForm nextPath={query.next} />;
}
