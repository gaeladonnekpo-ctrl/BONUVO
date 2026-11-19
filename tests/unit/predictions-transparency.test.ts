import { describe, expect, it } from "vitest";
import { isAuthorizedSportLogoUrl } from "@/components/ai/SportCrest";

describe("Point 5 - Predictions transparency & authorized sport logos", () => {
  it("allows site-local paths and official authorized sports CDNs", () => {
    expect(isAuthorizedSportLogoUrl("/logos/arsenal.png")).toBe(true);
    expect(isAuthorizedSportLogoUrl("https://media.api-sports.io/football/teams/42.png")).toBe(
      true,
    );
    expect(isAuthorizedSportLogoUrl("https://a.espncdn.com/i/teamlogos/soccer/500/359.png")).toBe(
      true,
    );
  });

  it("rejects unauthorized external URLs, http links, and protocol-relative URLs so monogram renders", () => {
    expect(isAuthorizedSportLogoUrl(null)).toBe(false);
    expect(isAuthorizedSportLogoUrl("")).toBe(false);
    expect(isAuthorizedSportLogoUrl("http://media.api-sports.io/football/teams/42.png")).toBe(
      false,
    );
    expect(isAuthorizedSportLogoUrl("//evil.example/logo.png")).toBe(false);
    expect(isAuthorizedSportLogoUrl("https://untrusted-site.example/crest.png")).toBe(false);
  });
});
