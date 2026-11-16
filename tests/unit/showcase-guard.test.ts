import { describe, expect, it } from "vitest";
import { isAllowedCommunityUrl } from "@/components/business/CommunityFab";
import { isDesignShowcaseEnabled } from "@/lib/design/showcase-guard";

describe("Phase 1 — Showcase guard & community URL allowlist", () => {
  it("bloque /admin/design dès que APP_ENV ou VERCEL_ENV vaut production", () => {
    expect(isDesignShowcaseEnabled({ APP_ENV: "production", NODE_ENV: "development" })).toBe(false);
    expect(
      isDesignShowcaseEnabled({
        APP_ENV: "production",
        NODE_ENV: "production",
        ALLOW_DEV_SHOWCASE: "1",
      }),
    ).toBe(false);
    expect(
      isDesignShowcaseEnabled({
        APP_ENV: "local",
        VERCEL_ENV: "production",
        ALLOW_DEV_SHOWCASE: "1",
      }),
    ).toBe(false);
  });

  it("bloque /admin/design par défaut en build NODE_ENV=production sans override local", () => {
    expect(isDesignShowcaseEnabled({ NODE_ENV: "production", APP_ENV: "local" })).toBe(false);
    expect(
      isDesignShowcaseEnabled({
        NODE_ENV: "production",
        APP_ENV: "local",
        ALLOW_DEV_SHOWCASE: "1",
      }),
    ).toBe(true);
  });

  it("autorise /admin/design uniquement en développement local", () => {
    expect(isDesignShowcaseEnabled({ NODE_ENV: "development", APP_ENV: "local" })).toBe(true);
  });

  it("restreint CommunityFab aux domaines HTTPS Telegram et WhatsApp autorisés", () => {
    expect(isAllowedCommunityUrl("https://t.me/bonuvo_test")).toBe(true);
    expect(isAllowedCommunityUrl("https://wa.me/22900000000")).toBe(true);
    expect(isAllowedCommunityUrl("https://chat.whatsapp.com/ABC123")).toBe(true);
    expect(isAllowedCommunityUrl("http://t.me/bonuvo_test")).toBe(false);
    expect(isAllowedCommunityUrl("https://evil.example/phish")).toBe(false);
    expect(isAllowedCommunityUrl("javascript:alert(1)")).toBe(false);
  });
});
