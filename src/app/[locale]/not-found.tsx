import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function LocaleNotFoundPage() {
  const t = useTranslations("errors");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-16 text-center text-fg">
      <p className="font-mono text-sm font-bold text-accent">{t("notFoundCode")}</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
        {t("notFoundTitle")}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-fg-muted sm:text-base">
        {t("notFoundDescription")}
      </p>
      <Button asChild className="mt-6">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </main>
  );
}
