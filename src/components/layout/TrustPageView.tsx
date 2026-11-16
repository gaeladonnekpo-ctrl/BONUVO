import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type TrustPageKey = "methodology" | "affiliation" | "responsible" | "privacy";

interface TrustSectionItem {
  readonly title: string;
  readonly body: string;
}

export function TrustPageView({ pageKey }: { pageKey: TrustPageKey }) {
  const t = useTranslations(`trustPages.${pageKey}`);
  const tBrand = useTranslations("brand");
  const sections = t.raw("sections") as readonly TrustSectionItem[];

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
      <Breadcrumb items={[{ label: tBrand("name"), href: "/" }, { label: t("nav") }]} />

      <header className="mt-4 max-w-3xl space-y-3">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-base leading-relaxed text-fg-muted sm:text-lg">{t("lead")}</p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-fg-muted">{section.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
