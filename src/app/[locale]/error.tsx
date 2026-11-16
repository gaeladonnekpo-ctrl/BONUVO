"use client";

import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ui/error-state";

export default function LocaleErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-lg">
        <ErrorState
          title={t("boundaryTitle")}
          description={t("boundaryDescription")}
          retryLabel={t("retryAction")}
          onRetry={reset}
        />
      </div>
    </main>
  );
}
