import { cookies, headers } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { SignUpForm } from "@/components/auth/AuthCredentialForms";
import { COUNTRY_COOKIE_NAME, normalizeCountryCode } from "@/lib/i18n/countries";

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, cookieStore, headerStore] = await Promise.all([params, cookies(), headers()]);
  setRequestLocale(locale);

  const rawCountry =
    cookieStore.get(COUNTRY_COOKIE_NAME)?.value ??
    headerStore.get("x-vercel-ip-country") ??
    undefined;

  return <SignUpForm initialCountry={normalizeCountryCode(rawCountry)} />;
}
