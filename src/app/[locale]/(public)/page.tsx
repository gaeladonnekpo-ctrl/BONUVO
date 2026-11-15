import { notFound } from "next/navigation";

const SUPPORTED_LOCALES = ["fr", "en"] as const;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function ProvisionalHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">BONUVO</h1>
      <p className="mt-4 text-base font-medium tracking-wide text-emerald-400 sm:text-lg">
        BONUVO: SMART OFFERS. BETTER CHOICES.
      </p>
    </main>
  );
}
