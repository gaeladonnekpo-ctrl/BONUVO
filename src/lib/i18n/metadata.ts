import type { Metadata } from "next";
import { LOCALES, type AppLocale } from "./config";

function resolveMetadataBase(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw) {
    try {
      return new URL(raw);
    } catch {
      return new URL("http://127.0.0.1:3000");
    }
  }
  return new URL("http://127.0.0.1:3000");
}

export function buildLocalizedMetadata({
  locale,
  pathname,
  title,
  description,
  noIndex = false,
}: {
  locale: AppLocale;
  pathname: string;
  title: string;
  description: string;
  noIndex?: boolean;
}): Metadata {
  const cleanPath = pathname === "/" ? "" : pathname;
  const languages: Record<string, string> = {};
  for (const item of LOCALES) {
    languages[item] = `/${item}${cleanPath}`;
  }
  languages["x-default"] = `/fr${cleanPath}`;

  return {
    metadataBase: resolveMetadataBase(),
    title,
    description,
    alternates: {
      canonical: `/${locale}${cleanPath}`,
      languages,
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
