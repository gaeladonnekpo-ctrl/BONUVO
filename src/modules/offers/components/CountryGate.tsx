"use client";

import { Globe2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { CountrySwitcher } from "@/components/layout/CountrySwitcher";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePathname, useRouter } from "@/i18n/navigation";
import { COUNTRY_COOKIE_NAME } from "@/lib/i18n/countries";

export interface CountryGateProps {
  countryCode: string;
  isCovered: boolean;
}

export function CountryGate({ countryCode, isCovered }: CountryGateProps) {
  const t = useTranslations("publicCatalog");
  const router = useRouter();
  const pathname = usePathname();

  function handleShowGlobal() {
    if (typeof document !== "undefined") {
      document.cookie = `${COUNTRY_COOKIE_NAME}=GLOBAL; Path=/; Max-Age=31536000; SameSite=Lax`;
      const params = new URLSearchParams(window.location.search);
      if (params.has("pays")) {
        params.delete("pays");
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
        return;
      }
    }
    router.refresh();
  }

  return (
    <EmptyState
      icon={<Globe2 className="h-6 w-6" aria-hidden="true" />}
      title={t("countryGateUnsupportedTitle", { country: countryCode })}
      description={
        isCovered ? t("countryGateUnsupportedDescription") : t("countryGateUnsupportedDescription")
      }
      action={
        <div className="flex flex-wrap items-center justify-center gap-3">
          <CountrySwitcher initialCountry={countryCode} />
          {countryCode !== "GLOBAL" ? (
            <Button type="button" variant="primary" size="sm" onClick={handleShowGlobal}>
              {t("countryGateShowGlobal")}
            </Button>
          ) : null}
        </div>
      }
    />
  );
}
