const CACHE_PREFIX = "bonuvo_app_cache:";

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export function getCachedValue<T>(
  key: string,
  maxAgeMs: number,
): { data: T; isStale: boolean; ageMs: number } | null {
  const fullKey = `${CACHE_PREFIX}${key}`;
  let entry = memoryCache.get(fullKey) as CacheEntry<T> | undefined;

  if (!entry && typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(fullKey);
      if (raw) {
        entry = JSON.parse(raw) as CacheEntry<T>;
        memoryCache.set(fullKey, entry);
      }
    } catch {
      // Ignore storage parse errors
    }
  }

  if (!entry) return null;
  const ageMs = Date.now() - entry.fetchedAt;
  if (ageMs > maxAgeMs) return null;

  return {
    data: entry.data,
    isStale: ageMs > maxAgeMs * 0.5,
    ageMs,
  };
}

export function setCachedValue<T>(key: string, data: T): void {
  const fullKey = `${CACHE_PREFIX}${key}`;
  const entry: CacheEntry<T> = { data, fetchedAt: Date.now() };
  memoryCache.set(fullKey, entry);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(fullKey, JSON.stringify(entry));
    } catch {
      // Ignore quota exceeded
    }
  }
}

export function deduplicateRequest<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = factory().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

/**
 * Clears ONLY ephemeral application caches (memory, bonuvo_app_cache:* storage, SW cache,
 * and public server catalog tags). Never touches auth sessions, cookies, preferences, or DB records.
 */
export async function clearApplicationCache(): Promise<{ clearedKeys: number }> {
  let clearedKeys = memoryCache.size;
  memoryCache.clear();
  inFlight.clear();

  if (typeof window !== "undefined") {
    try {
      const toRemoveSession: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i += 1) {
        const k = window.sessionStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) toRemoveSession.push(k);
      }
      for (const k of toRemoveSession) {
        window.sessionStorage.removeItem(k);
        clearedKeys += 1;
      }
    } catch {
      // Ignore storage access errors
    }

    try {
      const toRemoveLocal: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) toRemoveLocal.push(k);
      }
      for (const k of toRemoveLocal) {
        window.localStorage.removeItem(k);
        clearedKeys += 1;
      }
    } catch {
      // Ignore storage access errors
    }

    if ("caches" in window) {
      try {
        const names = await window.caches.keys();
        await Promise.all(
          names
            .filter((name) => name.startsWith("bonuvo-pwa-"))
            .map((name) => window.caches.delete(name)),
        );
      } catch {
        // Ignore Cache API errors
      }
    }

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_APP_CACHE" });
    }
  }

  try {
    await fetch("/api/cache/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch {
    // Non-blocking if offline
  }

  return { clearedKeys };
}
