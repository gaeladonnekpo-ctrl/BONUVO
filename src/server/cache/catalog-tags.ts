import "server-only";

import { revalidateTag, unstable_cache, updateTag } from "next/cache";

export const PUBLIC_CATALOG_CACHE_TAGS = {
  offers: "offers",
  bookmakers: "bookmakers",
  promoCodes: "promo-codes",
  countries: "countries",
  predictions: "predictions",
} as const;

export function withCatalogCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyParts: string[],
  tags: string[],
  revalidateSeconds = 300,
): (...args: TArgs) => Promise<TResult> {
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return fn;
  }

  return unstable_cache(fn, keyParts, {
    revalidate: revalidateSeconds,
    tags,
  });
}

export function invalidatePublicCatalogTags(tags: string[]) {
  const uniqueTags = Array.from(new Set(tags));
  for (const tag of uniqueTags) {
    try {
      updateTag(tag);
    } catch {
      try {
        revalidateTag(tag, { expire: 0 });
      } catch {
        // Ignored when invoked outside a Next.js request/action context (e.g. Vitest).
      }
    }
  }
}
