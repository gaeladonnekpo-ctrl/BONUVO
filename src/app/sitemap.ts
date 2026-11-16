import type { MetadataRoute } from "next";
import { listBookmakers, listOffers } from "@/modules/offers/public-service";

export const revalidate = 300;

function resolveBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "https://bonuvo.vercel.app";
  return raw.replace(/\/+$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = resolveBaseUrl();
  const staticRoutes = [
    "",
    "/offres",
    "/bookmakers",
    "/codes-promo",
    "/comparateur",
    "/methodologie",
    "/affiliation",
    "/jeu-responsable",
    "/confidentialite",
  ];

  const entries: MetadataRoute.Sitemap = [];
  for (const path of staticRoutes) {
    for (const locale of ["fr", "en"] as const) {
      entries.push({
        url: `${baseUrl}/${locale}${path}`,
        changeFrequency: path === "" || path === "/offres" ? "daily" : "weekly",
        priority: path === "" ? 1 : path === "/offres" ? 0.9 : 0.7,
        alternates: {
          languages: {
            fr: `${baseUrl}/fr${path}`,
            en: `${baseUrl}/en${path}`,
          },
        },
      });
    }
  }

  try {
    const [{ offers }, { bookmakers }] = await Promise.all([
      listOffers({ countryCode: "GLOBAL", locale: "fr" }),
      listBookmakers("GLOBAL"),
    ]);

    for (const offer of offers) {
      for (const locale of ["fr", "en"] as const) {
        entries.push({
          url: `${baseUrl}/${locale}/offres/${offer.offerSlug}`,
          lastModified: new Date(offer.updatedAtIso),
          changeFrequency: "daily",
          priority: 0.85,
          alternates: {
            languages: {
              fr: `${baseUrl}/fr/offres/${offer.offerSlug}`,
              en: `${baseUrl}/en/offres/${offer.offerSlug}`,
            },
          },
        });
      }
    }

    for (const bm of bookmakers) {
      for (const locale of ["fr", "en"] as const) {
        entries.push({
          url: `${baseUrl}/${locale}/bookmakers/${bm.slug}`,
          changeFrequency: "weekly",
          priority: 0.8,
          alternates: {
            languages: {
              fr: `${baseUrl}/fr/bookmakers/${bm.slug}`,
              en: `${baseUrl}/en/bookmakers/${bm.slug}`,
            },
          },
        });
      }
    }
  } catch {
    // Graceful fallback during build-time or disconnected preview builds
  }

  return entries;
}
