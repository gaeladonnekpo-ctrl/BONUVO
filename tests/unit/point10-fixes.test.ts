import { describe, expect, it, vi } from "vitest";
import { COUNTRY_OPTIONS, formatCountryDisplay } from "@/lib/i18n/countries";

vi.mock("@/modules/offers/public-service", () => ({
  listOffers: vi.fn().mockResolvedValue({ offers: [] }),
  listBookmakers: vi.fn().mockResolvedValue({ bookmakers: [] }),
}));

import sitemap from "@/app/sitemap";

describe("Point 10 fixes", () => {
  it("formats full localized country names instead of raw ISO codes", () => {
    const bj = COUNTRY_OPTIONS.find((c) => c.code === "BJ")!;
    const ci = COUNTRY_OPTIONS.find((c) => c.code === "CI")!;
    const global = COUNTRY_OPTIONS.find((c) => c.code === "GLOBAL")!;

    expect(formatCountryDisplay(bj, "fr", "International")).toBe("Bénin");
    expect(formatCountryDisplay(ci, "fr", "International")).toMatch(/Ivoire/);
    expect(formatCountryDisplay(bj, "en", "International")).toBe("Benin");
    expect(formatCountryDisplay(global, "fr", "International")).toBe("International");
  });

  it("includes /pronostics and /communaute in sitemap.xml for both fr and en", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls.some((u) => u.endsWith("/fr/pronostics"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/en/pronostics"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/fr/communaute"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/en/communaute"))).toBe(true);
  });
});
