import "server-only";

import { revalidateTag, unstable_cache, updateTag } from "next/cache";

export const PUBLIC_CATALOG_CACHE_TAGS = {
  offers: "offers",
  bookmakers: "bookmakers",
  promoCodes: "promo-codes",
  countries: "countries",
  predictions: "predictions",
  community: "community",
} as const;

type MemoryCacheEntry = {
  value: unknown;
  expiresAt: number;
  tags: readonly string[];
};

const l1MemoryCache = new Map<string, MemoryCacheEntry>();
const inflightRequests = new Map<string, Promise<unknown>>();
const MAX_L1_ENTRIES = 250;
let catalogCacheGeneration = 1;

export function getCatalogCacheGeneration(): number {
  return catalogCacheGeneration;
}

function buildCacheKey(keyParts: string[], args: unknown[]): string {
  return `${keyParts.join("::")}::${JSON.stringify(args)}`;
}

export function withCatalogCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyParts: string[],
  tags: string[],
  revalidateSeconds = 300,
): (...args: TArgs) => Promise<TResult> {
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return fn;
  }

  const nextCachedFn = unstable_cache(fn, keyParts, {
    revalidate: revalidateSeconds,
    tags,
  });

  return async (...args: TArgs): Promise<TResult> => {
    const cacheKey = buildCacheKey(keyParts, args);
    const now = Date.now();
    const hit = l1MemoryCache.get(cacheKey);
    if (hit && hit.expiresAt > now) {
      return hit.value as TResult;
    }

    const existingInflight = inflightRequests.get(cacheKey);
    if (existingInflight) {
      return existingInflight as Promise<TResult>;
    }

    const promise = (async () => {
      try {
        const result = await nextCachedFn(...args);
        if (l1MemoryCache.size >= MAX_L1_ENTRIES) {
          const oldestKey = l1MemoryCache.keys().next().value;
          if (oldestKey) l1MemoryCache.delete(oldestKey);
        }
        l1MemoryCache.set(cacheKey, {
          value: result,
          expiresAt: Date.now() + revalidateSeconds * 1000,
          tags,
        });
        return result;
      } finally {
        inflightRequests.delete(cacheKey);
      }
    })();

    inflightRequests.set(cacheKey, promise);
    return promise;
  };
}

export function invalidatePublicCatalogTags(tags: string[]) {
  catalogCacheGeneration += 1;
  const uniqueTags = Array.from(new Set(tags));
  for (const [key, entry] of l1MemoryCache.entries()) {
    if (entry.tags.some((t) => uniqueTags.includes(t))) {
      l1MemoryCache.delete(key);
    }
  }

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
