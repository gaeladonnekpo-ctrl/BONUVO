import { describe, expect, it } from "vitest";
import {
  PARTNER_SUPPORT_PROFILES,
  SUPPORT_SCENARIO_GUIDES,
} from "@/modules/offers/partner-support-data";

describe("partner-support-data", () => {
  it("covers all 8 active partners with valid emails and official HTTPS URLs", () => {
    const slugs = PARTNER_SUPPORT_PROFILES.map((p) => p.slug);
    expect(slugs).toEqual([
      "1xbet",
      "melbet",
      "betwinner",
      "megapari",
      "linebet",
      "paripesa",
      "1win",
      "winwinbet",
    ]);

    for (const profile of PARTNER_SUPPORT_PROFILES) {
      expect(profile.supportEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      if (profile.securityEmail) {
        expect(profile.securityEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      }
      if (profile.specializedEmail) {
        for (const addr of profile.specializedEmail.email.split(" · ")) {
          expect(addr.trim()).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        }
      }
      expect(profile.officialUrl).toMatch(/^https:\/\//);
      expect(profile.liveChat.trim().length).toBeGreaterThan(0);
    }
  });

  it("includes all 7 user problem-resolution playbooks", () => {
    const ids = SUPPORT_SCENARIO_GUIDES.map((g) => g.id);
    expect(ids).toEqual([
      "deposit",
      "withdrawal",
      "account-access",
      "kyc",
      "bonus",
      "bet-settlement",
      "complaint",
    ]);

    for (const guide of SUPPORT_SCENARIO_GUIDES) {
      expect(guide.stepsFr.length).toBeGreaterThanOrEqual(3);
      expect(guide.stepsEn.length).toBeGreaterThanOrEqual(3);
      expect(guide.recommendedChannelFr.trim().length).toBeGreaterThan(0);
      expect(guide.recommendedChannelEn.trim().length).toBeGreaterThan(0);
    }
  });
});
