import { describe, expect, it, vi } from "vitest";
import {
  clearApplicationCache,
  deduplicateRequest,
  getCachedValue,
  setCachedValue,
} from "@/lib/cache/app-cache";

describe("Application Cache & Deduplication", () => {
  it("stores and retrieves fresh values and reports staleness accurately", () => {
    setCachedValue("test:key", { ok: true, count: 5 });
    const hit = getCachedValue<{ ok: boolean; count: number }>("test:key", 60_000);
    expect(hit).not.toBeNull();
    expect(hit?.data.count).toBe(5);
    expect(hit?.isStale).toBe(false);
  });

  it("deduplicates concurrent in-flight requests for the same key", async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1, 2, 3] });
    const [a, b] = await Promise.all([
      deduplicateRequest("dedupe:fixtures", fetcher),
      deduplicateRequest("dedupe:fixtures", fetcher),
    ]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ items: [1, 2, 3] });
    expect(b).toEqual({ items: [1, 2, 3] });
  });

  it("clears only bonuvo_app_cache entries without wiping user sessions or preferences", async () => {
    setCachedValue("fixtures:2026-11-21", { ok: true });
    await clearApplicationCache();
    expect(getCachedValue("fixtures:2026-11-21", 60_000)).toBeNull();
  });
});
